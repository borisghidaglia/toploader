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

export const SORTS: { id: Sort; label: string; spoken: string; compare: (a: Card, b: Card) => number }[] = [
  { id: "price-desc", label: "PRICE↓", spoken: "price, high to low", compare: (a, b) => b.price - a.price },
  { id: "price-asc", label: "PRICE↑", spoken: "price, low to high", compare: (a, b) => a.price - b.price },
  { id: "newest", label: "NEWEST", spoken: "newest first", compare: (a, b) => b.year - a.year || b.price - a.price },
  { id: "oldest", label: "OLDEST", spoken: "oldest first", compare: (a, b) => a.year - b.year || b.price - a.price },
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

/** The buy menu: a pocket switcher, a sort toggle and the striped list of cards with prices. */
export function ItemList({ cards, selectedId, onSelect, pocket, onPocket, sort, onSort, checkedOn, className }: ItemListProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState({ up: false, down: false });
  const pocketLabel = POCKETS.find((p) => p.id === pocket)!.label;
  const order = SORTS.find((s) => s.id === sort)!;

  // Show the swaying arrows only when there's more list above or below.
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
    <div className={cn("flex min-h-0 flex-col gap-[calc(4*var(--px))]", className)}>
      <div className="flex gap-[calc(4*var(--px))]">
        <div className="gba-window flex flex-1 items-center justify-between">
          <PocketArrow direction="left" onClick={() => onPocket(-1)} />
          <p aria-live="polite">{pocketLabel}</p>
          <PocketArrow direction="right" onClick={() => onPocket(1)} />
        </div>
        <button
          type="button"
          onClick={onSort}
          aria-label={`Sort: ${order.spoken}. Change order`}
          className="gba-window gba-focus px-[calc(2*var(--px))] whitespace-nowrap outline-none"
        >
          {order.label}
        </button>
      </div>

      <div className="gba-list-window relative flex min-h-0 flex-1 flex-col">
        <div ref={scroller} className="gba-list min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="font-narrow">
            <div
              role="listbox"
              tabIndex={0}
              aria-label="Cards"
              aria-activedescendant={optionId(selectedId)}
              className="gba-focus pt-[calc(8*var(--px))] outline-none"
            >
              {cards.map((card) => (
                <div
                  key={card.id}
                  id={optionId(card.id)}
                  role="option"
                  aria-selected={card.id === selectedId}
                  onClick={() => onSelect(card)}
                  className="gba-row flex cursor-pointer"
                >
                  <span aria-hidden className="gba-cursor w-[calc(8*var(--px))] flex-none">
                    ▶
                  </span>
                  <span className="gba-row-body flex min-w-0 flex-1 gap-[calc(4*var(--px))] whitespace-nowrap">
                    <span className="min-w-0 flex-1 truncate">{card.name.toUpperCase()}</span>
                    {card.condition === "LP" && (
                      <abbr title="Lightly played" className="gba-blue no-underline">
                        LP
                      </abbr>
                    )}
                    <span>{formatPrice(card.price)}</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="space-y-[calc(8*var(--px))] pt-[calc(16*var(--px))] pb-[calc(8*var(--px))] pl-[calc(8*var(--px))]">
              <p>
                Prices in USD, following TCGplayer market on {checkedOn}. LP means lightly played, marked down
                20%.
              </p>
              <p>
                Card images from TCGdex. Sprites, fonts and music from Pokémon Emerald, by way of the
                pret/pokeemerald decompilation. Pokémon and its art belong to Nintendo, Creatures and GAME FREAK.
                Toploader is a fan project and isn&apos;t affiliated with them.
              </p>
            </div>
          </div>
        </div>
        {more.up && (
          <span aria-hidden className="gba-sprite gba-scroll pointer-events-none absolute top-0 left-[calc(50%-7*var(--px))]" />
        )}
        {more.down && (
          <span
            aria-hidden
            data-dir="down"
            className="gba-sprite gba-scroll pointer-events-none absolute bottom-0 left-[calc(50%-7*var(--px))]"
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
      className="gba-focus grid h-[calc(16*var(--px))] w-[calc(16*var(--px))] place-items-center outline-none"
    >
      <span data-dir={direction} className="gba-sprite gba-pocket-arrow" />
    </button>
  );
}
