/**
 * The one sprite Emerald doesn't have: a speaker for the music toggle, drawn on
 * a 1px grid in the game's text colors, with the shadow the font gives its
 * letters (one pixel right, down and diagonally). CSS scales it by --px.
 */

type Rect = [x: number, y: number, w: number, h: number];

const TEXT = "#626262";
const SHADOW = "#d5d5cd";

function sprite(w: number, h: number, rects: Rect[]) {
  const rect = ([x, y, rw, rh]: Rect, color: string) =>
    `<rect x='${x}' y='${y}' width='${rw}' height='${rh}' fill='${color}'/>`;
  const shadow = rects.flatMap(([x, y, rw, rh]) =>
    [[1, 0], [0, 1], [1, 1]].map(([dx, dy]) => rect([x + dx, y + dy, rw, rh], SHADOW)),
  );
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' width='${w}' height='${h}' shape-rendering='crispEdges'>${shadow.join("")}${rects.map((r) => rect(r, TEXT)).join("")}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const CONE: Rect[] = [
  [0, 3, 2, 3],
  [2, 2, 1, 5],
  [3, 1, 1, 7],
  [4, 0, 1, 9],
];

export const SPEAKER_ON = sprite(12, 10, [
  ...CONE,
  [6, 3, 1, 3],
  [7, 2, 1, 1],
  [7, 6, 1, 1],
  [9, 2, 1, 5],
  [8, 1, 1, 1],
  [8, 7, 1, 1],
]);

export const SPEAKER_OFF = sprite(12, 10, [
  ...CONE,
  ...Array.from({ length: 5 }, (_, i): Rect[] => [
    [6 + i, 2 + i, 1, 1],
    [10 - i, 2 + i, 1, 1],
  ]).flat(),
]);
