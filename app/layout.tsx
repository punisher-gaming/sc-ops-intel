import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PUNISHER GAMING // SC OPS INTEL",
  description: "Star Citizen operations intel database — auto-synced ship, weapon, component, blueprint, and crafting data. PUNISHER GAMING.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=VT323&family=Inter:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="crt-scanlines" />
        <div className="crt-vignette" />
        {children}
      </body>
    </html>
  );
}
