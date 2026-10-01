import { formatPrice, type Card } from "@/lib/cards";

/** "KEIICHIRO ITO" → "Keiichiro Ito" */
export const artistName = (card: Card) =>
  card.illustrator?.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) ?? null;

/** What the clerk says, one dialog page per string. */

export function greeting(count: number) {
  return [
    `Welcome to TOPLOADER MART! We have ${count} cards in stock today.`,
    "Pick one from the list and I'll bring it out for you.",
  ];
}

export function describe(card: Card) {
  const rarity = card.rarity.toLowerCase();
  const article = /^[aeiou]/.test(rarity) ? "An" : "A";
  const artist = artistName(card);
  const kind = card.type === "Trainer" ? "A Trainer card" : `${card.type} type, ${card.hp} HP`;

  return [
    `${card.name.toUpperCase()}! ${article} ${rarity} from ${card.set}.`,
    card.condition === "LP"
      ? `It's lightly played, so I've marked it down. That one's ${formatPrice(card.price)}.`
      : `It's in near mint condition. That one's ${formatPrice(card.price)}.`,
    `${kind}. No. ${card.number} from ${card.year}${artist ? `, illustrated by ${artist}` : ""}.`,
  ];
}
