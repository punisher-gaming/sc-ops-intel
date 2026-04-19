import type { Metadata } from "next";
import "./globals.css";
import { MusicPlayer } from "@/components/MusicPlayer";
import { GlobalSearch } from "@/components/GlobalSearch";
import { WeatherTicker } from "@/components/WeatherTicker";

export const metadata: Metadata = {
  title: "CITIZENDEX · Star Citizen operations intel",
  description:
    "Star Citizen operations intel — ships, blueprints, resources, crafting. Auto-synced every patch.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="page-vignette" />
        <WeatherTicker />
        {children}
        <MusicPlayer />
        <GlobalSearch />
      </body>
    </html>
  );
}
