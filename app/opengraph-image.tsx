import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Urimai: claim what's yours";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px",
          background: "#0F4C5C",
          color: "#FAF7F2",
        }}
      >
        <div style={{ display: "flex", fontSize: 128, fontWeight: 700, color: "#FAF7F2" }}>
          Urimai
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 40,
            color: "#FAF7F2",
          }}
        >
          Tell us about yourself. We find the scholarships you can claim.
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 48,
            padding: "16px 36px",
            borderRadius: 999,
            background: "#E9A23B",
            color: "#0F4C5C",
            fontSize: 32,
            fontWeight: 600,
          }}
        >
          Tamil · English · Tanglish
        </div>
      </div>
    ),
    { ...size }
  );
}
