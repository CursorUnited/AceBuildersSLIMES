import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Tamil } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { LangProvider } from "@/components/LangProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const notoSansTamil = Noto_Sans_Tamil({
  variable: "--font-noto-tamil",
  subsets: ["tamil", "latin"],
  weight: ["400", "500", "600", "700"],
});

const TITLE = "Urimai: scholarships you can claim";
const DESCRIPTION =
  "Tell us about yourself in Tamil or English. We find the Tamil Nadu and central government scholarships you are likely eligible for.";

export const metadata: Metadata = {
  metadataBase: new URL("https://urimai-sigma.vercel.app"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "Urimai",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0F4C5C",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // LangProvider sets <html lang> to the stored language after mount.
  return (
    <html lang="en" className={`${inter.variable} ${notoSansTamil.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <LangProvider>
          <Header />
          {children}
        </LangProvider>
      </body>
    </html>
  );
}
