"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { CardStage } from "@/components/holo/card-stage";
import type { Card } from "@/lib/cards";
import { blip } from "@/lib/sound";
import { CardData } from "./card-data";
import { describe, greeting } from "./clerk";
import { DialogBox } from "./dialog-box";
import { ItemList, optionId, POCKETS, shelve, SORTS, type Pocket, type Sort } from "./item-list";
import { SoundToggle } from "./sound-toggle";
import { TiltToggle } from "./tilt-toggle";

function showOption(id: string) {
  requestAnimationFrame(() => document.getElementById(optionId(id))?.scrollIntoView({ block: "nearest" }));
}

/**
 * Toploader Mart: the shop as a Gen 3 buy screen. The shop floor fills the
 * screen, windows float over it, and the card you're on is brought out in 3D.
 */
export function Mart({ cards, checkedOn }: { cards: Card[]; checkedOn: string }) {
  const [pocket, setPocket] = useState<Pocket>("all");
  const [sort, setSort] = useState<Sort>("price-desc");
  const visible = shelve(cards, pocket, sort);
  const [selectedId, setSelectedId] = useState(visible[0].id);
  // The clerk greets you until you pick something.
  const [browsing, setBrowsing] = useState(false);
  const selected = cards.find((c) => c.id === selectedId)!;

  function select(card: Card) {
    if (card.id === selectedId) return;
    setSelectedId(card.id);
    setBrowsing(true);
    blip("move");
    showOption(card.id);
  }

  function move(step: number) {
    const i = visible.findIndex((c) => c.id === selectedId);
    select(visible[Math.max(0, Math.min(visible.length - 1, i + step))]);
  }

  function switchPocket(step: 1 | -1) {
    const i = POCKETS.findIndex((p) => p.id === pocket);
    const next = POCKETS[(i + step + POCKETS.length) % POCKETS.length].id;
    const shelf = shelve(cards, next, sort);
    const keep = shelf.some((c) => c.id === selectedId);
    setPocket(next);
    blip("page");
    if (!keep) {
      setSelectedId(shelf[0].id);
      setBrowsing(true);
    }
    showOption(keep ? selectedId : shelf[0].id);
  }

  function cycleSort() {
    const i = SORTS.findIndex((s) => s.id === sort);
    setSort(SORTS[(i + 1) % SORTS.length].id);
    blip("page");
    showOption(selectedId);
  }

  // Like a game, the arrow keys work from anywhere: up and down move the cursor,
  // left and right switch sections. Controls that use arrows themselves keep them.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if ((e.target as HTMLElement).closest("input, textarea, select, [contenteditable='true']")) return;
    const actions: Record<string, () => void> = {
      ArrowDown: () => move(1),
      ArrowUp: () => move(-1),
      ArrowRight: () => switchPocket(1),
      ArrowLeft: () => switchPocket(-1),
      Home: () => move(-visible.length),
      End: () => move(visible.length),
    };
    const action = actions[e.key];
    if (!action) return;
    e.preventDefault();
    action();
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="relative h-dvh overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0">
        <div className="mart-wall" />
        <div className="mart-shelves absolute inset-x-0" />
        <div className="gba-sprite mart-plant absolute left-[calc(2*var(--px))]" />
        {/* On desktop the list covers the right wall, so the plant moves in front of it. */}
        <div className="gba-sprite mart-plant absolute right-[calc(2*var(--px))] lg:right-[calc(min(36vw,520px)+8*var(--px))]" />
      </div>

      <div className="relative grid h-full grid-rows-[auto_minmax(0,1.2fr)_auto_minmax(0,1fr)] gap-[calc(2*var(--px))] p-[calc(2*var(--px))] lg:grid-cols-[minmax(0,1fr)_min(36vw,520px)] lg:grid-rows-[auto_minmax(0,1fr)_auto] lg:gap-[calc(4*var(--px))] lg:p-[calc(4*var(--px))]">
        <header className="flex items-start justify-between gap-2 lg:col-start-1">
          <p className="gba-window mart-sign px-3 py-1 text-[24px] leading-[32px]" data-variant="sign">
            TOPLOADER MART
          </p>
          <SoundToggle />
        </header>

        <section
          aria-label={`Showing ${selected.name}`}
          className="relative min-h-0 lg:col-start-1 lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:items-center lg:gap-[calc(4*var(--px))]"
        >
          <CardData card={selected} className="hidden lg:block" />
          <div className="relative h-full">
            {/* Sits just under the card's bottom edge: (1 + fill) / 2 - lift of the stage height. */}
            <div aria-hidden className="gba-sprite mart-rug absolute top-[84%] left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <CardStage
              cards={cards}
              index={cards.indexOf(selected)}
              priority
              fill={0.78}
              lift={0.07}
              sizes="(min-width: 1024px) 420px, 50vw"
              className="absolute inset-0"
            />
            <div className="absolute right-0 bottom-0">
              <TiltToggle />
            </div>
          </div>
        </section>

        <DialogBox
          key={browsing ? selected.id : "greeting"}
          pages={browsing ? describe(selected) : greeting(cards.length)}
          className="lg:col-start-1"
        />

        <ItemList
          cards={visible}
          selectedId={selectedId}
          onSelect={select}
          pocket={pocket}
          onPocket={switchPocket}
          sort={sort}
          onSort={cycleSort}
          checkedOn={checkedOn}
          className="lg:col-start-2 lg:row-span-3 lg:row-start-1"
        />
      </div>
    </div>
  );
}
