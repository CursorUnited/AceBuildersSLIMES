import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Urimai: scholarships you can claim",
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
