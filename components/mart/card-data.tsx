import { CONDITION_LABEL, formatMarket, formatPrice, type Card } from "@/lib/cards";
import { cn } from "@/lib/utils";
import { artistName } from "./clerk";

// The TCG's energy types, as the game's type icons. Trainers and Fairy have none.
const TYPE_ICONS: Record<string, string> = {
  Grass: "grass",
  Fire: "fire",
  Water: "water",
  Lightning: "electric",
  Psychic: "psychic",
  Fighting: "fight",
  Darkness: "dark",
  Metal: "steel",
  Dragon: "dragon",
  Colorless: "normal",
};

/** The selected card's details, in the buy menu's description box. */
export function CardData({ card, className }: { card: Card; className?: string }) {
  const artist = artistName(card);
  const icon = TYPE_ICONS[card.type];

  return (
    <div className={cn("gba-box", className)}>
      <p className="truncate">{card.name.toUpperCase()}</p>
      <div className="flex items-center gap-[calc(4*var(--px))] font-narrow">
        {icon ? (
          <span
            role="img"
            aria-label={`${card.type} type`}
            className="gba-sprite h-[calc(14*var(--px))] w-[calc(32*var(--px))]"
            style={{ "--sprite": `url(/emerald/types/${icon}.png)` } as React.CSSProperties}
          />
        ) : (
          <span className="gba-blue">{card.type.toUpperCase()}</span>
        )}
        {card.hp && <span>HP{card.hp}</span>}
        <span className="ml-auto">No.{card.number}</span>
      </div>
      <dl>
        <div className="flex justify-between">
          <dt className="gba-blue">PRICE</dt>
          <dd>{formatPrice(card.price)}</dd>
        </div>
        <div className="flex justify-between font-narrow">
          <dt className="gba-blue">MARKET</dt>
          <dd>{formatMarket(card.market)}</dd>
        </div>
        {/* The rest reads plainly without labels, so they're only spoken. */}
        <div className="font-narrow">
          <dt className="sr-only">Rarity</dt>
          <dd className="truncate">{card.rarity}</dd>
          <dt className="sr-only">Set</dt>
          <dd className="truncate">
            {card.set}, {card.year}
          </dd>
          <dt className="sr-only">Condition</dt>
          <dd>{CONDITION_LABEL[card.condition]}</dd>
          {artist && (
            <>
              <dt className="sr-only">Illustrator</dt>
              <dd className="truncate">Illus. {artist}</dd>
            </>
          )}
        </div>
      </dl>
    </div>
  );
}
