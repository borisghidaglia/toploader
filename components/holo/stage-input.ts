// Kept apart from card-scene.tsx so the DOM wrapper can use it without
// pulling three.js into the initial bundle.

/** Mutable input written by the DOM wrapper, read every frame by the scene. */
export type StageInput = {
  dragging: boolean;
  dragDx: number; // px accumulated since last frame
  hover: { x: number; y: number } | null; // -1..1 within the stage, mouse only
  turn: number; // pending half-turns from keyboard (±1)
  reducedMotion: boolean;
};

export function createStageInput(): StageInput {
  return { dragging: false, dragDx: 0, hover: null, turn: 0, reducedMotion: false };
}

/** Default share of the stage's height the card fills at rest. */
export const CARD_FILL = 0.74;
