/**
 * Original pixel art for the in-game shop, drawn as rectangles on a 1px grid and
 * turned into SVG data URIs. CSS scales them by whole numbers (--px), so every
 * art pixel stays a crisp square.
 */

class Pixels {
  private rects: string[] = [];
  constructor(
    readonly w: number,
    readonly h: number,
  ) {}

  fill(x: number, y: number, w: number, h: number, color: string) {
    this.rects.push(`<rect x='${x}' y='${y}' width='${w}' height='${h}' fill='${color}'/>`);
    return this;
  }

  dot(x: number, y: number, color: string) {
    return this.fill(x, y, 1, 1, color);
  }

  url() {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${this.w} ${this.h}' width='${this.w}' height='${this.h}' shape-rendering='crispEdges'>${this.rects.join("")}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }
}

/** A 12×12 nine-slice window with rounded corners: outline, band, inner light, fill. */
function frame(outline: string, band: string, light: string, fill: string) {
  const p = new Pixels(12, 12);
  p.fill(2, 0, 8, 12, outline).fill(0, 2, 12, 8, outline).fill(1, 1, 10, 10, outline);
  p.fill(2, 1, 8, 10, band).fill(1, 2, 10, 8, band);
  p.fill(2, 2, 8, 8, light);
  p.fill(3, 3, 6, 6, fill);
  return p.url();
}

function floorTile() {
  const p = new Pixels(16, 16);
  p.fill(0, 0, 16, 16, "#dce4ee");
  p.fill(0, 0, 15, 1, "#f4f8fc").fill(0, 0, 1, 15, "#f4f8fc");
  p.fill(0, 15, 16, 1, "#b4c0d0").fill(15, 0, 1, 16, "#b4c0d0");
  p.dot(4, 5, "#c8d2e0").dot(11, 10, "#c8d2e0").dot(9, 3, "#e8eef6");
  return p.url();
}

/** The back wall, ceiling trim to baseboard, plus the shadow it casts on the floor. */
function wallStrip() {
  const p = new Pixels(16, 40);
  p.fill(0, 0, 16, 5, "#343c58").fill(0, 5, 16, 1, "#4c5678");
  p.fill(0, 6, 16, 24, "#f0e6c6");
  p.fill(0, 6, 16, 1, "#f8f2dc");
  p.fill(0, 12, 16, 4, "#5878c0").fill(0, 12, 16, 1, "#88a8e8").fill(0, 15, 16, 1, "#3c5698");
  p.fill(15, 6, 1, 24, "#ddd0a8");
  p.fill(0, 30, 16, 3, "#b09868").fill(0, 30, 16, 1, "#c8b080").fill(0, 33, 16, 1, "#806840");
  p.fill(0, 34, 16, 3, "rgba(36,44,80,0.16)").fill(0, 37, 16, 3, "rgba(36,44,80,0.07)");
  return p.url();
}

const PACKS = [
  ["#e04838", "#f88068", "#a02820"],
  ["#3870d8", "#78a8f8", "#204898"],
  ["#f0b828", "#f8e070", "#b08010"],
  ["#40a050", "#80d088", "#287038"],
  ["#8850c8", "#b890f0", "#583090"],
];

/** A shelf of booster packs, three levels, with a little gap on each side for spacing. */
function shelf() {
  const p = new Pixels(40, 56);
  const x0 = 4;
  // Body and outline
  p.fill(x0 + 1, 0, 30, 52, "#283048").fill(x0, 1, 32, 50, "#283048");
  p.fill(x0 + 1, 1, 30, 50, "#7888a8");
  p.fill(x0 + 1, 1, 30, 5, "#b8c4dc").fill(x0 + 1, 1, 30, 1, "#d8e0f0").fill(x0 + 1, 6, 30, 1, "#5c6888");
  p.fill(x0 + 1, 7, 1, 44, "#98a8c8").fill(x0 + 30, 7, 1, 44, "#586480");
  // Three levels of packs on planks
  for (let level = 0; level < 3; level++) {
    const y = 8 + level * 14;
    p.fill(x0 + 3, y, 26, 11, "#3c4664");
    for (let i = 0; i < 5; i++) {
      const [body, hi, lo] = PACKS[(i * 2 + level * 3) % PACKS.length];
      const px = x0 + 4 + i * 5;
      p.fill(px, y + 2, 4, 9, body).fill(px, y + 2, 1, 9, hi).fill(px, y + 10, 4, 1, lo);
      p.fill(px, y + 1, 4, 1, "#d8dce8").fill(px + 1, y + 5, 2, 2, hi);
    }
    p.fill(x0 + 2, y + 11, 28, 1, "#e8ecf4").fill(x0 + 2, y + 12, 28, 1, "#a8b4cc");
  }
  p.fill(x0 + 2, 50, 28, 1, "#4c5878");
  // Feet and floor shadow
  p.fill(x0 + 2, 51, 3, 1, "#283048").fill(x0 + 27, 51, 3, 1, "#283048");
  p.fill(x0, 52, 32, 2, "rgba(36,44,80,0.22)").fill(x0 + 2, 54, 28, 1, "rgba(36,44,80,0.1)");
  return p.url();
}

function plant() {
  const p = new Pixels(20, 30);
  const dark = "#2c6830";
  const mid = "#48983c";
  const light = "#80c858";
  // Leaves: a round bush built from overlapping blocks
  p.fill(6, 0, 8, 2, dark).fill(3, 2, 14, 2, dark).fill(1, 4, 18, 10, dark).fill(3, 14, 14, 3, dark);
  p.fill(6, 1, 8, 2, mid).fill(4, 3, 12, 2, mid).fill(2, 5, 16, 8, mid).fill(4, 13, 12, 3, mid);
  p.fill(6, 3, 4, 2, light).fill(4, 5, 4, 3, light).fill(11, 6, 3, 2, light).fill(7, 9, 3, 2, light);
  p.fill(14, 10, 2, 2, dark).fill(5, 12, 2, 2, dark).fill(10, 4, 1, 3, dark);
  // Pot
  p.fill(3, 17, 14, 3, "#803818").fill(4, 17, 12, 2, "#e08848");
  p.fill(5, 20, 10, 7, "#803818").fill(6, 20, 8, 6, "#c06830").fill(6, 20, 2, 6, "#e08848");
  p.fill(4, 27, 12, 3, "rgba(36,44,80,0.2)");
  return p.url();
}

function rug(w: number, h: number) {
  const p = new Pixels(w, h);
  // Fringe on the short ends
  for (let y = 2; y < h - 2; y += 2) p.fill(0, y, 2, 1, "#e8d8b0").fill(w - 2, y, 2, 1, "#e8d8b0");
  p.fill(2, 0, w - 4, h, "#7c2028");
  p.fill(3, 1, w - 6, h - 2, "#c84038");
  p.fill(5, 3, w - 10, h - 6, "#7c2028").fill(6, 4, w - 12, h - 8, "#d85840");
  p.fill(6, 4, w - 12, 1, "#e87858");
  // A row of diamonds down the middle
  const mid = Math.floor(h / 2);
  for (let cx = 12; cx < w - 10; cx += 10) {
    p.dot(cx, mid - 3, "#f0b860").fill(cx - 1, mid - 2, 3, 1, "#f0b860").fill(cx - 2, mid - 1, 5, 2, "#f0b860");
    p.fill(cx - 1, mid + 1, 3, 1, "#f0b860").dot(cx, mid + 2, "#f0b860").fill(cx, mid - 1, 1, 2, "#c84038");
  }
  return p.url();
}

function triangle(dir: "up" | "down" | "left" | "right", color: string) {
  const vertical = dir === "up" || dir === "down";
  const p = new Pixels(vertical ? 7 : 4, vertical ? 4 : 7);
  for (let i = 0; i < 4; i++) {
    const span = 7 - i * 2;
    const at = dir === "down" || dir === "right" ? i : 3 - i;
    if (vertical) p.fill(i, at, span, 1, color);
    else p.fill(at, i, 1, span, color);
  }
  return p.url();
}

function speaker(on: boolean) {
  const p = new Pixels(11, 9);
  const c = "#404048";
  p.fill(0, 3, 2, 3, c).fill(2, 2, 1, 5, c).fill(3, 1, 1, 7, c).fill(4, 0, 1, 9, c);
  if (on) {
    p.fill(6, 3, 1, 3, c).dot(7, 2, c).dot(7, 6, c);
    p.fill(9, 2, 1, 5, c).dot(8, 1, c).dot(8, 7, c);
  } else {
    for (let i = 0; i < 5; i++) p.dot(6 + i, 2 + i, c).dot(10 - i, 2 + i, c);
  }
  return p.url();
}

/** Every sprite as a CSS custom property, set once on the shop's root element. */
export const pixelArt = {
  "--frame": frame("#283050", "#5870b8", "#a8c8f8", "#f8f8f8"),
  "--frame-sign": frame("#503018", "#a06830", "#e0a858", "#f8f0d0"),
  "--floor": floorTile(),
  "--wall": wallStrip(),
  "--shelf": shelf(),
  "--plant": plant(),
  "--rug": rug(96, 18),
  "--cursor": triangle("right", "#404048"),
  "--next": triangle("down", "#e05030"),
  "--scroll-up": triangle("up", "#e07038"),
  "--scroll-down": triangle("down", "#e07038"),
  "--pocket-left": triangle("left", "#404048"),
  "--pocket-right": triangle("right", "#404048"),
  "--speaker-on": speaker(true),
  "--speaker-off": speaker(false),
} as React.CSSProperties;
