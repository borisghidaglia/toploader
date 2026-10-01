import { CONDITION_LABEL, formatMarket, formatPrice, type Card } from "@/lib/cards";
import { cn } from "@/lib/utils";
import { artistName } from "./clerk";

const TYPE_COLORS: Record<string, string> = {
  Grass: "#78c850",
  Fire: "#f08030",
  Water: "#6890f0",
  Lightning: "#e8b820",
  Psychic: "#f85888",
  Fighting: "#c03028",
  Darkness: "#705848",
  Metal: "#a0a0c0",
  Fairy: "#ee99ac",
  Dragon: "#7038f8",
  Colorless: "#a8a878",
  Trainer: "#8890a8",
};

/** The selected card's details, laid out like a summary screen. */
export function CardData({ card, className }: { card: Card; className?: string }) {
  const artist = artistName(card);
  return (
    <div className={cn("gba-window px-3 py-2", className)}>
      <p className="text-[16px] leading-[20px] text-gba-label">No. {card.number}</p>
      <p className="text-[24px] leading-[28px]">{card.name.toUpperCase()}</p>
      <div className="mt-2 flex items-center gap-3">
        <span
          className="gba-type px-1.5 text-[16px] leading-[20px]"
          style={{ "--type": TYPE_COLORS[card.type] ?? TYPE_COLORS.Colorless } as React.CSSProperties}
        >
          {card.type.toUpperCase()}
        </span>
        {card.hp && (
          <span className="text-[16px]">
            HP <span className="text-[24px]">{card.hp}</span>
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-3 border-y-[length:var(--px)] border-dashed border-[#c8d4ec] py-2">
        <span className="text-[16px] text-gba-label">PRICE</span>
        <span className="text-[32px] leading-[36px]">{formatPrice(card.price)}</span>
      </div>

      <dl className="mt-2 space-y-1.5 text-[16px] leading-[20px]">
        <Fact label="MARKET" value={formatMarket(card.market)} />
        <Fact label="RARITY" value={card.rarity} />
        <Fact label="COND." value={CONDITION_LABEL[card.condition]} />
        <Fact label="SET" value={`${card.set}, ${card.year}`} />
        {artist && <Fact label="ILLUS." value={artist} />}
      </dl>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-[64px] flex-none text-gba-label">{label}</dt>
      <dd className="min-w-0">{value}</dd>
    </div>
  );
}
