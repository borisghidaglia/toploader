// Kept apart from card-scene.tsx so the DOM wrapper can use it without
// pulling three.js into the initial bundle.

/** Mutable input written by the DOM wrapper, read every frame by the scene. */
export type StageInput = {
  dragging: boolean;
  dragDx: number; // px accumulated since last frame
  dragDy: number;
  turn: number; // pending half-turns from keyboard (±1)
  reducedMotion: boolean;
};

export function createStageInput(): StageInput {
  return { dragging: false, dragDx: 0, dragDy: 0, turn: 0, reducedMotion: false };
}

/** Default share of the stage's height the card fills at rest. */
export const CARD_FILL = 0.74;

/** The most of the stage's width the card may fill. */
export const CARD_MAX_WIDTH = 0.86;

/** A standard TCG card is 63 × 88 mm. */
export const CARD_ASPECT = 63 / 88;
