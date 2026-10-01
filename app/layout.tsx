import type { Metadata, Viewport } from "next";
import { Tiny5 } from "next/font/google";
import { pixelArt } from "@/lib/pixel-art";
import "./globals.css";

const pixel = Tiny5({ variable: "--font-pixel", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Toploader Mart · Pokémon card shop",
  description: "Raw Pokémon singles from Base Set to Prismatic Evolutions, priced against TCGplayer market.",
};

export const viewport: Viewport = {
  themeColor: "#343c58",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={pixel.variable}>
      <body style={pixelArt}>{children}</body>
    </html>
  );
}
