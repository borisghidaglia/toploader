import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { preload } from "react-dom";
import "./globals.css";

export const metadata: Metadata = {
  title: "Toploader Mart · Pokémon card shop",
  description: "Raw Pokémon singles from Base Set to Prismatic Evolutions, priced against TCGplayer market.",
};

export const viewport: Viewport = {
  // The top of the Mart's back wall.
  themeColor: "#b4b4a4",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // The game fonts are declared in globals.css; fetch them before the CSS asks.
  for (const font of ["emerald-normal", "emerald-narrow"]) {
    preload(`/emerald/fonts/${font}.woff2`, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  }

  return (
    <html lang="en">
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
