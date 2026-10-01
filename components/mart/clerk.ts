import { formatPrice, type Card } from "@/lib/cards";

/** "KEIICHIRO ITO" → "Keiichiro Ito" */
export const artistName = (card: Card) =>
  card.illustrator?.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) ?? null;

/** What the clerk says, one message box page per string, in the Mart clerk's own words. */

export function greeting(count: number) {
  return [
    "Welcome to TOPLOADER MART! How may I serve you?",
    `We have ${count} cards in stock today. Pick one and I'll bring it out.`,
  ];
}

export function describe(card: Card) {
  const name = card.name.toUpperCase();
  const price = formatPrice(card.price);
  const rarity = card.rarity.toLowerCase();
  const article = /^[aeiou]/.test(rarity) ? "an" : "a";
  const artist = artistName(card);
  const kind = card.type === "Trainer" ? "A Trainer card" : `${card.type} type, ${card.hp} HP`;

  return [
    card.condition === "LP"
      ? `${name}? It's lightly played, so I've marked it down to ${price}.`
      : `${name}? Certainly. That will be ${price}.`,
    `It's ${article} ${rarity} from ${card.set}, ${card.year}.`,
    `${kind}, No. ${card.number}${artist ? `, illustrated by ${artist}` : ""}.`,
  ];
}
