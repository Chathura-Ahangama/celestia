import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

/* ---------- FONTS ---------- */
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-cormorant",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-mono-geist",
  display: "swap",
});

/* ---------- METADATA ---------- */
export const metadata: Metadata = {
  title: "Celestia — The Sky Remembers",
  description:
    "Reveal the astronomically accurate night sky at the exact moment you were born.",
  keywords: [
    "birth sky",
    "astronomy",
    "zodiac",
    "constellations",
    "moon phase",
    "celestia",
  ],
  authors: [{ name: "Celestia" }],
  openGraph: {
    title: "Celestia — The Sky Remembers",
    description:
      "The astronomically accurate night sky at the moment you were born.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#050510",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

/* ---------- ROOT LAYOUT ---------- */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

