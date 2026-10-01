// Renders the shop's card back (used on the reverse of the 3D card) to public/card-back.webp.
import sharp from "sharp";
import path from "node:path";

const W = 600;
const H = 825;
const cx = W / 2;
const cy = H / 2;

// A loose vortex: arcs whose radius and sweep grow as they wind outward.
const arcs = Array.from({ length: 28 }, (_, i) => {
  const r = 40 + i * 15;
  const start = i * 0.55;
  const sweep = 1.1 + (i % 5) * 0.25;
  const a0 = start;
  const a1 = start + sweep;
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0) * 1.15;
  const x1 = cx + (r + 22) * Math.cos(a1);
  const y1 = cy + (r + 22) * Math.sin(a1) * 1.15;
  const width = 10 + (i % 4) * 7;
  const opacity = 0.05 + ((i * 7) % 5) * 0.025;
  return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${(r * 1.15).toFixed(1)} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" stroke="#cfe0ff" stroke-opacity="${opacity.toFixed(3)}" stroke-width="${width}" stroke-linecap="round" fill="none"/>`;
}).join("\n");

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="field" cx="50%" cy="50%" r="70%">
      <stop offset="0" stop-color="#5d8cf0"/>
      <stop offset="0.45" stop-color="#2a55c4"/>
      <stop offset="1" stop-color="#0f2266"/>
    </radialGradient>
    <filter id="clouds" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.009 0.013" numOctaves="4" seed="11"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.78  0 0 0 0 0.86  0 0 0 0 1  0 0 0 1.3 -0.55"/>
    </filter>
    <filter id="soft"><feGaussianBlur stdDeviation="6"/></filter>
    <radialGradient id="ballTop" cx="38%" cy="30%" r="80%">
      <stop offset="0" stop-color="#ff6a4a"/>
      <stop offset="1" stop-color="#c41f12"/>
    </radialGradient>
    <radialGradient id="ballBottom" cx="38%" cy="20%" r="90%">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#c9cfdc"/>
    </radialGradient>
    <clipPath id="inner"><rect x="30" y="30" width="${W - 60}" height="${H - 60}" rx="18"/></clipPath>
  </defs>

  <rect width="${W}" height="${H}" fill="#1b3a94"/>
  <g clip-path="url(#inner)">
    <rect width="${W}" height="${H}" fill="url(#field)"/>
    <rect width="${W}" height="${H}" filter="url(#clouds)" opacity="0.55"/>
    <g filter="url(#soft)">${arcs}</g>
  </g>
  <rect x="30" y="30" width="${W - 60}" height="${H - 60}" rx="18" fill="none" stroke="#0c1c55" stroke-width="4"/>

  <g transform="translate(${cx} ${cy})">
    <circle r="132" fill="#0c1c55" opacity="0.35" filter="url(#soft)"/>
    <path d="M-120 0 A120 120 0 0 1 120 0 Z" fill="url(#ballTop)"/>
    <path d="M-120 0 A120 120 0 0 0 120 0 Z" fill="url(#ballBottom)"/>
    <rect x="-121" y="-9" width="242" height="18" fill="#151826"/>
    <circle r="120" fill="none" stroke="#151826" stroke-width="9"/>
    <circle r="38" fill="#151826"/>
    <circle r="25" fill="#f4f6fb"/>
    <ellipse cx="-48" cy="-70" rx="34" ry="16" fill="#fff" opacity="0.28" transform="rotate(-28 -48 -70)"/>
  </g>
</svg>`;

const out = path.resolve(import.meta.dirname, "../public/card-back.webp");
await sharp(Buffer.from(svg)).webp({ quality: 86 }).toFile(out);
console.log("Wrote", out);
