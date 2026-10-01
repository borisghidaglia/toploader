import { cards } from "@/lib/cards";

// A card's own page is the shop, opened on that card (the Mart reads it from the address).
export { default } from "../../page";

// Every card is prerendered; any other id is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return cards.map((card) => ({ id: card.id }));
}
