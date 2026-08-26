import type { Metadata } from "next";
import { Anton, Inter, Fredoka } from "next/font/google";
import "./globals.css";

const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-anton" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const fredoka = Fredoka({ subsets: ["latin"], weight: "600", variable: "--font-fredoka" });

export const metadata: Metadata = {
  title: "PepRoulette FPL",
  description: "Fantasy Premier League mini-league analytics and awards.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${inter.variable} ${fredoka.variable}`}>
      <body>{children}</body>
    </html>
  );
}
