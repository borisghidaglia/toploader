// The images here are drawn into a PNG by next/og, which next/image has no part in.
/* eslint-disable @next/next/no-img-element */
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import type { Card } from "@/lib/cards";

/**
 * The image a link to the shop unfurls into: the Mart drawn like the page, with
 * the clerk's line in the message box and the card (or a few) brought out.
 * It's rendered at build time by next/og, from the same sprites and fonts.
 */

export const LINK_PREVIEW_SIZE = { width: 1200, height: 630 };

// Screen pixels per GBA pixel: big enough to read when the preview is shown small.
const S = 4;
const px = (n: number) => n * S;

// Text colors and their shadows, as in globals.css (the shadows are the fonts' palette).
const TEXT = { color: "#626262", shadow: "#d5d5cd" };
const SIGN_TEXT = { color: "#ffffff", shadow: "#29315a" };

// The cards on show when the link is to the shop rather than a card, back to front.
const FEATURED = ["neo1-9", "swsh7-215", "base1-4"];

const dataUri = (png: Buffer) => `data:image/png;base64,${png.toString("base64")}`;

type Region = { left: number; top: number; width: number; height: number };
type Sprite = { src: string; width: number; height: number };

// next/og scales images smoothly, which would blur the pixel art, so the
// sprites are enlarged here first, pixel by pixel.
async function sprite(name: string, region?: Region): Promise<Sprite> {
  let image = sharp(join(process.cwd(), "public/emerald", name));
  const { width, height } = region ?? (await image.metadata());
  if (region) image = image.extract(region);
  const png = await image.resize(px(width), px(height), { kernel: "nearest" }).png().toBuffer();
  return { src: dataUri(png), width: px(width), height: px(height) };
}

async function cardImage(card: Card, height: number): Promise<Sprite> {
  const width = Math.round((height * 63) / 88);
  const png = await sharp(join(process.cwd(), "public/cards", basename(card.image))).resize(width, height, { fit: "cover" }).png().toBuffer();
  return { src: dataUri(png), width, height };
}

/** The cards to show for the shop as a whole: the featured ones, or else the dearest. */
export function featured(cards: Card[]) {
  const picks = [...FEATURED.flatMap((id) => cards.filter((c) => c.id === id)), ...cards.toSorted((a, b) => b.price - a.price)];
  return [...new Set(picks)].slice(0, 3);
}

export async function linkPreview({ message, cards }: { message: string; cards: Card[] }) {
  const [floor, wall, counter, shelf, popup, box, fonts, images] = await Promise.all([
    sprite("floor.png"),
    sprite("wall.png"),
    sprite("counter.png"),
    sprite("shelf.png"),
    sprite("popup.png"),
    messageBoxSlices(),
    loadFonts(),
    Promise.all(cards.map((card) => cardImage(card, cards.length > 1 ? 440 : 560))),
  ]);

  return new ImageResponse(
    (
      <div style={{ display: "flex", position: "relative", width: "100%", height: "100%", ...tiled(floor) }}>
        {/* The back wall repeats on from map column 4; columns 0-3 are the counter. */}
        <div style={{ position: "absolute", left: px(64), right: 0, top: 0, height: wall.height, ...tiled(wall, "repeat-x") }} />
        <img alt="" src={counter.src} width={counter.width} height={counter.height} style={{ position: "absolute", left: 0, top: 0 }} />
        <img alt="" src={shelf.src} width={shelf.width} height={shelf.height} style={{ position: "absolute", left: px(80), top: px(32) }} />

        {images.length === 1 ? (
          <CardPhoto image={images[0]} style={{ left: 760, top: (630 - images[0].height) / 2 }} />
        ) : (
          // Held out in a fan, like a hand of cards: turned about a point below them.
          images.map((image, i) => (
            <CardPhoto
              key={i}
              image={image}
              style={{
                left: 930 - image.width / 2,
                top: 600 - image.height,
                transformOrigin: "50% 150%",
                transform: `rotate(${[-9, 9, 0][i]}deg)`,
              }}
            />
          ))
        )}

        <MessageBox slices={box} style={{ left: px(4), bottom: px(4), width: 704 }}>
          <ShadowedText font="Emerald Normal" colors={TEXT}>
            {message}
          </ShadowedText>
        </MessageBox>

        {/* The wooden sign the shop's name arrives on, at the end of its slide. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            display: "flex",
            justifyContent: "center",
            width: popup.width,
            height: popup.height,
            paddingTop: px(11),
            backgroundImage: `url(${popup.src})`,
          }}
        >
          <ShadowedText font="Emerald Narrow" colors={SIGN_TEXT}>
            TOPLOADER MART
          </ShadowedText>
        </div>
      </div>
    ),
    { ...LINK_PREVIEW_SIZE, fonts },
  );
}

function tiled(image: Sprite, repeat = "repeat") {
  return {
    backgroundImage: `url(${image.src})`,
    backgroundSize: `${image.width}px ${image.height}px`,
    backgroundRepeat: repeat,
  };
}

function CardPhoto({ image, style }: { image: Sprite; style: React.CSSProperties }) {
  return (
    <div
      style={{
        position: "absolute",
        display: "flex",
        width: image.width,
        height: image.height,
        // A standard card's corner radius (see CardStage's placeholder).
        borderRadius: Math.round(image.width * 0.045),
        overflow: "hidden",
        boxShadow: "0 12px 28px rgba(41, 49, 90, 0.35)",
        ...style,
      }}
    >
      <img alt="" src={image.src} width={image.width} height={image.height} />
    </div>
  );
}

// The fonts draw each letter's shadow from a color layer next/og can't read, so the
// text goes down twice: in the shadow glyphs, then the letters over them.
function ShadowedText({
  font,
  colors,
  children,
}: {
  font: string;
  colors: { color: string; shadow: string };
  children: string;
}) {
  const text = { fontSize: px(16), lineHeight: `${px(16)}px` };
  return (
    <div style={{ display: "flex", position: "relative" }}>
      <div style={{ ...text, position: "absolute", left: 0, top: 0, right: 0, fontFamily: `${font} Shadow`, color: colors.shadow }}>
        {children}
      </div>
      <div style={{ ...text, fontFamily: font, color: colors.color }}>{children}</div>
    </div>
  );
}

// The overworld message box: two tile columns on the sides, one on the top and bottom.
async function messageBoxSlices() {
  const edges = { x: [0, 16, 24], w: [16, 8, 16], y: [0, 8, 16], h: [8, 8, 8] };
  const slices = await Promise.all(
    [0, 1, 2].flatMap((row) =>
      [0, 1, 2].map((col) =>
        sprite("message-box.png", { left: edges.x[col], top: edges.y[row], width: edges.w[col], height: edges.h[row] }),
      ),
    ),
  );
  return slices;
}

function MessageBox({ slices, style, children }: { slices: Sprite[]; style: React.CSSProperties; children: React.ReactNode }) {
  const side = px(16);
  const cap = px(8);
  const place = [
    { left: 0, top: 0, width: side, height: cap },
    { left: side, right: side, top: 0, height: cap },
    { right: 0, top: 0, width: side, height: cap },
    { left: 0, top: cap, bottom: cap, width: side },
    { left: side, right: side, top: cap, bottom: cap },
    { right: 0, top: cap, bottom: cap, width: side },
    { left: 0, bottom: 0, width: side, height: cap },
    { left: side, right: side, bottom: 0, height: cap },
    { right: 0, bottom: 0, width: side, height: cap },
  ];
  return (
    <div style={{ position: "absolute", display: "flex", padding: `${cap}px ${side}px`, ...style }}>
      {slices.map((slice, i) => (
        <div key={i} style={{ position: "absolute", ...place[i], ...tiled(slice) }} />
      ))}
      {/* At least two lines, as in the game; the text sits a pixel down. */}
      <div style={{ display: "flex", position: "relative", top: px(1), minHeight: px(32), width: "100%" }}>{children}</div>
    </div>
  );
}

async function loadFonts() {
  const faces = ["Emerald Normal", "Emerald Normal Shadow", "Emerald Narrow", "Emerald Narrow Shadow"];
  return Promise.all(
    faces.map(async (name) => ({
      name,
      data: await readFile(join(process.cwd(), "assets/og", `${name.toLowerCase().replaceAll(" ", "-")}.ttf`)),
      weight: 400 as const,
      style: "normal" as const,
    })),
  );
}
