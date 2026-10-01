"use client";

import { useEffect, useRef, useState } from "react";
import { formatPrice, type Card, type Era } from "@/lib/cards";
import { cn } from "@/lib/utils";

export type Pocket = "all" | Era;
export type Sort = "price-desc" | "price-asc" | "newest" | "oldest";

export const POCKETS: { id: Pocket; label: string }[] = [
  { id: "all", label: "ALL CARDS" },
  { id: "vintage", label: "VINTAGE" },
  { id: "modern", label: "MODERN" },
];

export const SORTS: { id: Sort; label: string; compare: (a: Card, b: Card) => number }[] = [
  { id: "price-desc", label: "$$$ FIRST", compare: (a, b) => b.price - a.price },
  { id: "price-asc", label: "$ FIRST", compare: (a, b) => a.price - b.price },
  { id: "newest", label: "NEWEST", compare: (a, b) => b.year - a.year || b.price - a.price },
  { id: "oldest", label: "OLDEST", compare: (a, b) => a.year - b.year || b.price - a.price },
];

export function shelve(cards: Card[], pocket: Pocket, sort: Sort) {
  const compare = SORTS.find((s) => s.id === sort)!.compare;
  return cards.filter((c) => pocket === "all" || c.era === pocket).toSorted(compare);
}

export const optionId = (id: string) => `card-${id}`;

type ItemListProps = {
  cards: Card[];
  selectedId: string;
  onSelect: (card: Card) => void;
  pocket: Pocket;
  onPocket: (step: 1 | -1) => void;
  sort: Sort;
  onSort: () => void;
  checkedOn: string;
  className?: string;
};

/** The buy menu: a pocket switcher, a sort toggle and the cursor list of cards with prices. */
export function ItemList({ cards, selectedId, onSelect, pocket, onPocket, sort, onSort, checkedOn, className }: ItemListProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState({ up: false, down: false });
  const pocketIndex = POCKETS.findIndex((p) => p.id === pocket);
  const sortLabel = SORTS.find((s) => s.id === sort)!.label;

  // Show the bouncing arrows only when there's more list above or below.
  useEffect(() => {
    const el = scroller.current!;
    const measure = () => {
      const up = el.scrollTop > 4;
      const down = el.scrollTop + el.clientHeight < el.scrollHeight - 4;
      setMore((m) => (m.up === up && m.down === down ? m : { up, down }));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    observer.observe(el.firstElementChild!);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, []);

  return (
    <div className={cn("flex min-h-0 flex-col gap-[calc(2*var(--px))]", className)}>
      <div className="flex gap-[calc(2*var(--px))]">
        <div className="gba-window flex flex-1 items-center justify-between">
          <PocketArrow direction="left" onClick={() => onPocket(-1)} />
          <div className="flex flex-col items-center">
            <p className="text-[24px] leading-[28px]" aria-live="polite">
              {POCKETS[pocketIndex].label}
            </p>
            <div className="flex gap-[calc(2*var(--px))] pb-1" aria-hidden>
              {POCKETS.map((p, i) => (
                <span
                  key={p.id}
                  className={cn("size-[calc(2*var(--px))]", i === pocketIndex ? "bg-gba-label" : "bg-[#c8d4ec]")}
                />
              ))}
            </div>
          </div>
          <PocketArrow direction="right" onClick={() => onPocket(1)} />
        </div>
        <button
          type="button"
          onClick={onSort}
          aria-label={`Sort: ${sortLabel.toLowerCase()}. Change order`}
          className="gba-window gba-focus flex flex-col items-start justify-center px-2 outline-none"
        >
          <span className="text-[16px] leading-[16px] text-gba-label">SORT</span>
          <span className="text-[24px] leading-[28px] whitespace-nowrap">{sortLabel}</span>
        </button>
      </div>

      <div className="gba-window relative flex min-h-0 flex-1 flex-col">
        <div ref={scroller} className="gba-list min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div>
            <div
              role="listbox"
              tabIndex={0}
              aria-label="Cards"
              aria-activedescendant={optionId(selectedId)}
              className="gba-focus py-1.5 outline-none"
            >
              {cards.map((card) => (
                <div
                  key={card.id}
                  id={optionId(card.id)}
                  role="option"
                  aria-selected={card.id === selectedId}
                  onClick={() => onSelect(card)}
                  className="gba-option flex h-10 cursor-pointer items-center gap-2 px-2.5 text-[24px] lg:px-3"
                >
                  <span className="gba-sprite gba-cursor" />
                  <span className="min-w-0 flex-1 truncate">{card.name.toUpperCase()}</span>
                  {card.condition === "LP" && (
                    <span className="text-[16px] text-gba-dim" title="Lightly played">
                      LP
                    </span>
                  )}
                  <span className="tabular-nums">{formatPrice(card.price)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 px-3 pt-3 pb-4 text-[16px] leading-[20px] text-gba-dim [text-shadow:none] lg:px-4">
              <p>
                Prices in USD, following TCGplayer market on {checkedOn}. LP means lightly played, marked down
                20%.
              </p>
              <p>
                Card images from TCGdex. Music: &ldquo;Shop&rdquo; from Pokémon Emerald. Pokémon, the card art and
                the music &copy; Nintendo, Creatures and GAME FREAK. Toploader is a fan project and isn&apos;t
                affiliated with them.
              </p>
            </div>
          </div>
        </div>
        {more.up && (
          <span
            aria-hidden
            className="gba-sprite gba-scroll pointer-events-none absolute -top-[calc(5*var(--px))] left-1/2 -translate-x-1/2 [--sprite:var(--scroll-up)]"
          />
        )}
        {more.down && (
          <span
            aria-hidden
            className="gba-sprite gba-scroll pointer-events-none absolute -bottom-[calc(5*var(--px))] left-1/2 -translate-x-1/2 [--sprite:var(--scroll-down)]"
          />
        )}
      </div>
    </div>
  );
}

function PocketArrow({ direction, onClick }: { direction: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "left" ? "Previous section" : "Next section"}
      className="gba-focus grid h-12 w-10 place-items-center outline-none"
    >
      <span
        className={cn(
          "gba-sprite h-[calc(7*var(--px))] w-[calc(4*var(--px))]",
          direction === "left" ? "[--sprite:var(--pocket-left)]" : "[--sprite:var(--pocket-right)]",
        )}
      />
    </button>
  );
}
