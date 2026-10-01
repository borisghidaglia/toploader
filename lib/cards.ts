import inventory from "@/data/cards.json";

export type Foil = "window" | "full" | "none";
export type Condition = "NM" | "LP";
export type Era = "vintage" | "modern";

export type Card = {
  id: string;
  name: string;
  number: string;
  set: string;
  year: number;
  era: Era;
  rarity: string;
  type: string;
  hp: number | null;
  illustrator: string | null;
  foil: Foil;
  condition: Condition;
  market: number;
  price: number;
  image: string;
};

export const cards = inventory.cards as Card[];
export const pricesCheckedOn = inventory.updated;

// The cards that rotate through the hero, in display order.
const FEATURED_IDS = ["swsh7-215", "base1-4", "sv08-238", "neo1-9", "sv03.5-199"];
export const featured = FEATURED_IDS.map((id) => cards.find((c) => c.id === id)!);

export const CONDITION_LABEL: Record<Condition, string> = {
  NM: "Near Mint",
  LP: "Lightly Played",
};

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const usdCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const formatPrice = (n: number) => usd.format(n);
export const formatMarket = (n: number) => usdCents.format(n);

export function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Normalized art-box rectangle for vintage holos, in UV space (origin bottom-left):
// [left, bottom, right, top]. Measured from 600×825 scans of Base–Neo era cards.
export const ART_WINDOW = [0.1, 0.485, 0.9, 0.886] as const;
