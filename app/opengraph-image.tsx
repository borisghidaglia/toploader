import { greeting } from "@/components/mart/clerk";
import { cards } from "@/lib/cards";
import { featured, LINK_PREVIEW_SIZE, linkPreview } from "@/lib/link-preview";

const onShow = featured(cards);

export const size = LINK_PREVIEW_SIZE;
export const contentType = "image/png";
export const alt = `Toploader Mart, drawn as a Poké Mart from Pokémon Emerald. The clerk says “${greeting(cards.length)[0]}”, with ${onShow.map((c) => c.name).join(", ")} cards held out.`;

export default function Image() {
  return linkPreview({ message: greeting(cards.length)[0], cards: onShow });
}
