import { describe } from "@/components/mart/clerk";
import { cards } from "@/lib/cards";
import { LINK_PREVIEW_SIZE, linkPreview } from "@/lib/link-preview";

// Drawn at build time for every card, like the pages.
export { generateStaticParams } from "./page";
export const dynamicParams = false;

export const size = LINK_PREVIEW_SIZE;
export const contentType = "image/png";
// The same for every card: the page's title and description say which one it is.
export const alt = "A Pokémon card brought out at Toploader Mart, with the clerk telling you its price.";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = cards.find((c) => c.id === id)!;
  return linkPreview({ message: describe(card)[0], cards: [card] });
}
