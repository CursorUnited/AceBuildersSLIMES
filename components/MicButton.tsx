"use client";

// Mic button: records a clip, sends it to /api/transcribe, and fills the input via onText.
// Falls back to the browser Web Speech API when the server is unavailable or MediaRecorder is missing.
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { t } from "@/lib/i18n/strings";
import type { Lang } from "@/lib/storage";

const MAX_SECONDS = 30;
const SEND_URL = "/api/transcribe";
const PREFERRED_MIME = "audio/webm;codecs=opus";
const FALLBACK_MIME = "audio/mp4";
const TranscriptSchema = z.object({ text: z.string() });

type Phase = "idle" | "recording" | "sending";

// Minimal Web Speech API typings (not in the TS DOM lib).
type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechCtor = new () => SpeechRecognitionLike;

function speechCtor(): SpeechCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type Props = {
  onText: (text: string) => void;
  disabled?: boolean;
  lang: Lang;
};

export default function MicButton({ onText, disabled = false, lang }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [blocked, setBlocked] = useState(false);

  const onTextRef = useRef(onText);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const tickRef = useRef<number | undefined>(undefined);
  const stopTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  // Release mic, timers and recorder on unmount.
  useEffect(() => {
    return () => {
      window.clearInterval(tickRef.current);
      window.clearTimeout(stopTimeoutRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const rec = recorderRef.current;
      if (rec) {
        rec.onstop = null;
        if (rec.state !== "inactive") rec.stop();
      }
      recognitionRef.current?.stop();
    };
  }, []);

  function clearTimers() {
    window.clearInterval(tickRef.current);
    window.clearTimeout(stopTimeoutRef.current);
    tickRef.current = undefined;
    stopTimeoutRef.current = undefined;
  }

  function startTimers() {
    setSeconds(0);
    let elapsed = 0;
    tickRef.current = window.setInterval(() => {
      elapsed += 1;
      setSeconds(elapsed);
    }, 1000);
    stopTimeoutRef.current = window.setTimeout(() => stopCapture(), MAX_SECONDS * 1000);
  }

  function releaseStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function finishSpeech() {
    clearTimers();
    recognitionRef.current = null;
    setPhase("idle");
  }

  // Browser fallback: streams the live transcript into the input.
  function startSpeechFallback() {
    const Ctor = speechCtor();
    if (!Ctor) {
      setPhase("idle");
      return;
    }
    const rec = new Ctor();
    rec.lang = lang === "en" ? "en-IN" : "ta-IN";
    rec.interimResults = true;
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i += 1) {
        const result = e.results[i];
        if (result) text += result[0].transcript;
      }
      const trimmed = text.trim();
      if (trimmed.length > 0) onTextRef.current(trimmed);
    };
    rec.onerror = () => finishSpeech();
    rec.onend = () => finishSpeech();
    recognitionRef.current = rec;
    setPhase("recording");
    startTimers();
    try {
      rec.start();
    } catch {
      finishSpeech();
    }
  }

  // Sends the recorded clip; on 503 switches to the browser fallback.
  async function upload(blob: Blob) {
    setPhase("sending");
    try {
      const form = new FormData();
      form.append("audio", blob, "clip");
      const res = await fetch(SEND_URL, { method: "POST", body: form });
      if (res.status === 503) {
        startSpeechFallback();
        return;
      }
      if (!res.ok) {
        setPhase("idle");
        return;
      }
      const parsed = TranscriptSchema.safeParse(await res.json());
      if (parsed.success && parsed.data.text.length > 0) onTextRef.current(parsed.data.text);
      setPhase("idle");
    } catch {
      setPhase("idle");
    }
  }

  async function start() {
    const canRecord =
      typeof MediaRecorder !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function";
    if (!canRecord) {
      startSpeechFallback();
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") setBlocked(true);
      else startSpeechFallback();
      return;
    }

    streamRef.current = stream;
    const mimeType = MediaRecorder.isTypeSupported(PREFERRED_MIME) ? PREFERRED_MIME : FALLBACK_MIME;
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType });
    } catch {
      recorder = new MediaRecorder(stream);
    }

    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      clearTimers();
      releaseStream();
      recorderRef.current = null;
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType });
      chunksRef.current = [];
      void upload(blob);
    };

    try {
      recorder.start();
    } catch {
      releaseStream();
      startSpeechFallback();
      return;
    }
    recorderRef.current = recorder;
    setPhase("recording");
    startTimers();
  }

  function stopCapture() {
    clearTimers();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }

  function onClick() {
    if (phase === "recording") stopCapture();
    else if (phase === "idle") void start();
  }

  if (blocked) {
    return (
      <p role="status" className="flex min-h-11 items-center px-2 text-base text-red-700">
        {t("micBlocked", lang)}
      </p>
    );
  }

  const isRecording = phase === "recording";
  const isSending = phase === "sending";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={(disabled && !isRecording) || isSending}
      aria-label={isRecording ? t("micStop", lang) : t("micStart", lang)}
      className="btn-outline flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-base disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isRecording ? (
        <>
          <span aria-hidden="true" className="inline-block h-3 w-3 animate-pulse rounded-full bg-red-600" />
          <span className="tabular-nums">{seconds}s</span>
          <span>{t("micStop", lang)}</span>
        </>
      ) : isSending ? (
        <span role="status">{t("micListening", lang)}</span>
      ) : (
        <span aria-hidden="true">🎤</span>
      )}
    </button>
  );
}
