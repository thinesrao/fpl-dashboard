import type { Metadata } from "next";
import { Anton, Inter, Fredoka } from "next/font/google";
import "./globals.css";

const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-anton" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const fredoka = Fredoka({ subsets: ["latin"], weight: "600", variable: "--font-fredoka" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://peproulette.vercel.app";
const DESCRIPTION = "Fantasy Premier League mini-league analytics and awards.";

export const metadata: Metadata = {
  // Resolves relative metadata (incl. the opengraph-image) to an absolute URL
  // on the canonical domain rather than the per-deployment Vercel URL.
  metadataBase: new URL(SITE_URL),
  title: "PepRoulette FPL",
  description: DESCRIPTION,
  openGraph: {
    title: "PepRoulette FPL",
    description: DESCRIPTION,
    type: "website",
    siteName: "PepRoulette",
  },
  twitter: {
    card: "summary_large_image",
    title: "PepRoulette FPL",
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${inter.variable} ${fredoka.variable}`}>
      <body>{children}</body>
    </html>
  );
}
