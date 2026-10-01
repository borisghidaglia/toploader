"use client";

import { useState } from "react";
import { CardDrawer } from "@/components/card-drawer";
import { CardTile } from "@/components/card-tile";
import { useInspecting } from "@/components/stage-coordinator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Card, Era } from "@/lib/cards";

type EraFilter = "all" | Era;
type Sort = "price-desc" | "price-asc" | "newest" | "oldest";

const SORTS: Record<Sort, { label: string; short: string; compare: (a: Card, b: Card) => number }> = {
  "price-desc": { label: "Price, high to low", short: "Price ↓", compare: (a, b) => b.price - a.price },
  "price-asc": { label: "Price, low to high", short: "Price ↑", compare: (a, b) => a.price - b.price },
  newest: { label: "Newest sets first", short: "Newest", compare: (a, b) => b.year - a.year || b.price - a.price },
  oldest: { label: "Oldest sets first", short: "Oldest", compare: (a, b) => a.year - b.year || b.price - a.price },
};
const SORT_ITEMS = Object.entries(SORTS).map(([value, { label }]) => ({ value, label }));

const ERAS: { value: EraFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "vintage", label: "Vintage" },
  { value: "modern", label: "Modern" },
];

export function Catalog({ cards }: { cards: Card[] }) {
  const [era, setEra] = useState<EraFilter>("all");
  const [sort, setSort] = useState<Sort>("price-desc");
  const [selected, setSelected] = useState<Card | null>(null);
  const [open, setOpen] = useState(false);
  const { setInspecting } = useInspecting();

  const counts = {
    all: cards.length,
    vintage: cards.filter((c) => c.era === "vintage").length,
    modern: cards.filter((c) => c.era === "modern").length,
  };
  const visible = cards.filter((c) => era === "all" || c.era === era).toSorted(SORTS[sort].compare);

  function openCard(card: Card) {
    setSelected(card);
    setOpen(true);
    setInspecting(true);
  }

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) setInspecting(false);
  }

  return (
    <section aria-labelledby="case-heading" className="case-surface relative z-10 -mt-7 rounded-t-[28px] pb-16">
      <div className="px-4 pt-7 pb-2 sm:px-8">
        <h2 id="case-heading" className="font-display text-[34px] font-black uppercase leading-[0.9] [font-stretch:125%] sm:text-5xl">
          In the case
        </h2>
        <p className="mt-2 max-w-sm text-[15px] text-muted-ink">
          Raw singles, sleeved and toploaded. Tap a card to turn it over.
        </p>
      </div>

      <div className="filter-bar sticky top-0 z-20 px-4 py-3 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <ToggleGroup
            value={[era]}
            onValueChange={(v) => v[0] && setEra(v[0] as EraFilter)}
            aria-label="Era"
            spacing={0}
            className="rounded-full bg-ink/[0.06] p-1"
          >
            {ERAS.map((e) => (
              <ToggleGroupItem
                key={e.value}
                value={e.value}
                className="h-9 rounded-full px-3 text-[13px] font-semibold text-muted-ink first:rounded-full last:rounded-full hover:bg-transparent hover:text-ink aria-pressed:bg-ink aria-pressed:text-case aria-pressed:hover:bg-ink aria-pressed:hover:text-case"
              >
                {e.label}
                <span className="font-mono text-[10px] font-normal opacity-60">{counts[e.value]}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <Select value={sort} onValueChange={(v) => v && setSort(v as Sort)} items={SORT_ITEMS}>
            <SelectTrigger aria-label="Sort" className="h-9! rounded-full border-ink/15 bg-transparent px-3 text-[13px] font-semibold">
              <SelectValue>{(v: Sort) => SORTS[v].short}</SelectValue>
            </SelectTrigger>
            <SelectContent align="end" alignItemWithTrigger={false}>
              {SORT_ITEMS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 px-4 pt-5 sm:grid-cols-3 sm:px-8 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {visible.map((card, i) => (
          <li key={card.id}>
            <CardTile card={card} eager={i < 4} onOpen={() => openCard(card)} />
          </li>
        ))}
      </ul>

      <CardDrawer card={selected} open={open} onOpenChange={changeOpen} onClosed={() => setSelected(null)} />
    </section>
  );
}
