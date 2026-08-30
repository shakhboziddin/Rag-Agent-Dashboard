import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Kontent Zavod — Prodyuser paneli",
  description: "AI Prodyuser: intervyu tahlili va bilim bazasi",
};

export default function RootLayout({ children }) {
  return (
    <html lang="uz" className={`${geistSans.variable} ${geistMono.variable}`}>
      {/*
        suppressHydrationWarning is needed because browser extensions
        (ColorZilla, Grammarly, password managers) inject attributes like
        cz-shortcut-listen="true" into <body> before React hydrates.
        That mismatch is harmless and comes from the extension, not our code.
      */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}