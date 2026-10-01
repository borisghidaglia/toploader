import * as THREE from "three";

// A standard TCG card is 63 × 88 mm. Scene units: 1 = 25.2 mm.
export const CARD_W = 2.5;
export const CARD_H = (CARD_W * 88) / 63;
const RADIUS = 0.12;
const DEPTH = 0.018;

/**
 * Rounded, slightly thick card. Group 0 = front + back faces, group 1 = edge.
 * UVs on the faces span 0–1 across the whole card so a scan maps edge to edge.
 */
export function createCardGeometry() {
  const w = CARD_W / 2;
  const h = CARD_H / 2;
  const r = RADIUS;

  const shape = new THREE.Shape();
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w + r, -h);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: DEPTH,
    bevelEnabled: false,
    curveSegments: 10,
  });
  geometry.translate(0, 0, -DEPTH / 2);

  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) + w) / CARD_W, (pos.getY(i) + h) / CARD_H);
  }
  uv.needsUpdate = true;
  return geometry;
}
