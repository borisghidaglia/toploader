import type { Metadata, Viewport } from "next";
import { Anybody, Martian_Mono } from "next/font/google";
import "./globals.css";

const anybody = Anybody({
  variable: "--font-anybody",
  subsets: ["latin"],
  axes: ["wdth"],
});

const martianMono = Martian_Mono({
  variable: "--font-martian",
  subsets: ["latin"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: "Toploader · Pokémon singles",
  description: "Raw Pokémon singles from Base Set to Prismatic Evolutions, priced against TCGplayer market.",
};

export const viewport: Viewport = {
  themeColor: "#12142b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${anybody.variable} ${martianMono.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
