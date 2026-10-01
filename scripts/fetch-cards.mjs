// Pulls card metadata + market prices from TCGdex and downloads card images.
// Run with `pnpm cards`. Writes data/cards.json and public/cards/*.webp.
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const API = "https://api.tcgdex.net/v2/en";

// [tcgdex id, foil treatment, tcgplayer price key, condition]
// foil: "window" = vintage holo (foil only in the art box), "full" = full-art foil, "none" = flat print
const INVENTORY = [
  ["swsh7-215", "full", "holofoil", "NM"],
  ["sv08.5-161", "full", "holofoil", "NM"],
  ["swsh7-218", "full", "holofoil", "NM"],
  ["base1-4", "window", "holofoil", "NM"],
  ["swsh11-186", "full", "holofoil", "NM"],
  ["neo2-13", "window", "unlimited-holofoil", "LP"],
  ["neo1-9", "window", "unlimited-holofoil", "NM"],
  ["sv03.5-199", "full", "holofoil", "NM"],
  ["sv08-238", "full", "holofoil", "NM"],
  ["base1-2", "window", "holofoil", "NM"],
  ["base3-5", "window", "unlimited-holofoil", "NM"],
  ["base1-15", "window", "holofoil", "LP"],
  ["swsh4-188", "full", "holofoil", "NM"],
  ["base2-11", "window", "unlimited-holofoil", "NM"],
  ["sv03.5-168", "full", "holofoil", "NM"],
  ["base1-10", "window", "holofoil", "NM"],
  ["sv03.5-170", "full", "holofoil", "NM"],
  ["sv03.5-166", "full", "holofoil", "NM"],
  ["sv03.5-175", "full", "holofoil", "NM"],
  ["sv02-269", "full", "holofoil", "NM"],
  ["sv03.5-193", "full", "holofoil", "NM"],
  ["base1-58", "none", "normal", "NM"],
  ["base1-35", "none", "normal", "NM"],
  ["base1-46", "none", "normal", "NM"],
  ["base2-51", "none", "unlimited", "NM"],
  ["sv03.5-025", "none", "normal", "NM"],
];

const CONDITION_FACTOR = { NM: 1, LP: 0.8 };

// Shop pricing: market price, nudged into the round numbers a counter tag would show.
function shopPrice(market, condition) {
  const p = market * CONDITION_FACTOR[condition];
  if (p < 2) return 1;
  if (p < 20) return Math.ceil(p);
  if (p < 200) return Math.ceil(p / 5) * 5;
  if (p < 1000) return Math.ceil(p / 10) * 10;
  return Math.ceil(p / 50) * 50;
}

const setCache = new Map();
async function getSet(id) {
  if (!setCache.has(id)) {
    setCache.set(id, fetch(`${API}/sets/${id}`).then((r) => r.json()));
  }
  return setCache.get(id);
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

await mkdir(path.join(ROOT, "public/cards"), { recursive: true });
await mkdir(path.join(ROOT, "data"), { recursive: true });

const cards = [];
for (const [id, foil, priceKey, condition] of INVENTORY) {
  const c = await fetch(`${API}/cards/${id}`).then((r) => r.json());
  const set = await getSet(c.set.id);

  const tcg = c.variants_detailed
    ?.map((v) => v.pricing?.tcgplayer?.[priceKey])
    .find(Boolean);
  const market = tcg?.marketPrice ?? tcg?.midPrice;
  if (!market) throw new Error(`No ${priceKey} price for ${id}`);

  const file = `public/cards/${id}.webp`;
  if (!(await exists(path.join(ROOT, file)))) {
    const img = await fetch(`${c.image}/high.webp`);
    if (!img.ok) throw new Error(`Image ${id}: ${img.status}`);
    await writeFile(path.join(ROOT, file), Buffer.from(await img.arrayBuffer()));
  }

  cards.push({
    id,
    name: c.name,
    number: `${c.localId}/${c.set.cardCount.official}`,
    set: c.set.name,
    year: Number(set.releaseDate.slice(0, 4)),
    era: Number(set.releaseDate.slice(0, 4)) < 2010 ? "vintage" : "modern",
    // TCGdex lists vintage holos as plain "Rare"; collectors call them Holo Rares.
    rarity: foil === "window" && c.rarity === "Rare" ? "Holo Rare" : c.rarity,
    type: c.types?.[0] ?? "Trainer",
    hp: c.hp ?? null,
    illustrator: c.illustrator ?? null,
    foil,
    condition,
    market: Math.round(market * 100) / 100,
    price: shopPrice(market, condition),
    image: `/cards/${id}.webp`,
  });
  console.log(`✓ ${id} ${c.name} — $${market}`);
}

await writeFile(
  path.join(ROOT, "data/cards.json"),
  JSON.stringify({ updated: new Date().toISOString().slice(0, 10), cards }, null, 2) + "\n",
);
console.log(`Wrote ${cards.length} cards.`);
