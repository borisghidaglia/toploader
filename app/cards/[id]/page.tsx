import type { Metadata } from "next";
import { describe } from "@/components/mart/clerk";
import { cards } from "@/lib/cards";

// A card's own page is the shop, opened on that card (the Mart reads it from the address).
export { default } from "../../page";

// Every card is prerendered; any other id is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return cards.map((card) => ({ id: card.id }));
}

// What a link to the card says: its name, and the clerk telling you about it.
export async function generateMetadata({ params }: PageProps<"/cards/[id]">): Promise<Metadata> {
  const { id } = await params;
  const card = cards.find((c) => c.id === id)!;
  return {
    title: `${card.name}, ${card.set} · Toploader Mart`,
    description: describe(card).join(" "),
  };
}
