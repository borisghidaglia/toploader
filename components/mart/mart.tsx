"use client";

import { usePathname } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { CardStage } from "@/components/holo/card-stage";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { Card } from "@/lib/cards";
import { loadSounds, playSelectSound } from "@/lib/sound";
import { CardData } from "./card-data";
import { anythingElse, describe, greeting } from "./clerk";
import { DialogBox } from "./dialog-box";
import { ItemList, optionId, POCKETS, shelve, SORTS, type Pocket, type Sort } from "./item-list";
import { SoundToggle } from "./sound-toggle";

// Too narrow to show the list and the card side by side (Tailwind's max-lg). The server
// assumes it isn't, since that's where the card shows from the start.
const NARROW = "(width < 64rem)";

// Each card has its own page, prerendered like the list's. Moving between them
// only rewrites the address, which Next keeps in step with its router.
const cardPath = (id: string | null) => (id ? `/cards/${id}` : "/");
const cardIdIn = (path: string) => /^\/cards\/([^/]+)/.exec(path)?.[1] ?? null;

// Browsers cap how often the address can change, and holding an arrow key would
// go past that, so in-place updates wait for the cursor to settle.
let pendingAddress: { path: string; timer: number } | null = null;

function replaceAddress(path: string) {
  if (pendingAddress) clearTimeout(pendingAddress.timer);
  pendingAddress = { path, timer: window.setTimeout(flushAddress, 300) };
}

function flushAddress() {
  if (!pendingAddress) return;
  clearTimeout(pendingAddress.timer);
  window.history.replaceState(null, "", pendingAddress.path);
  pendingAddress = null;
}

function showOption(id: string) {
  requestAnimationFrame(() => document.getElementById(optionId(id))?.scrollIntoView({ block: "nearest" }));
}

/**
 * Toploader Mart: the shop as Emerald's buy screen. The Mart's floor fills the
 * screen with the clerk at the counter, the game's windows sit on top, and the
 * card you're on is brought out in 3D.
 *
 * Wide screens show the list and the card side by side. Phones go back and
 * forth like the game: pick from the list and the card comes out full size,
 * with the clerk's message under it; back returns to the list.
 *
 * The card in view is in the address (/cards/<id>), so a link opens the shop on it.
 */
export function Mart({ cards, checkedOn }: { cards: Card[]; checkedOn: string }) {
  const [pocket, setPocket] = useState<Pocket>("all");
  const [sort, setSort] = useState<Sort>("price-desc");
  const visible = shelve(cards, pocket, sort);
  // The card in view, from the page it was opened on. On phones, one being in view
  // is what brings it out over the list.
  const [inViewId, setInViewId] = useState(cardIdIn(usePathname()));
  const inView = cards.find((c) => c.id === inViewId);
  // The list's cursor, which is on the card in view whenever there is one.
  const [selectedId, setSelectedId] = useState(inView?.id ?? visible[0].id);
  // The clerk greets you until you pick something, or arrive on something.
  const [picked, setPicked] = useState(!!inView);
  // Whether this visit brought the card out, so back can undo that instead of leaving the shop.
  const openedHere = useRef(false);
  const narrow = useMediaQuery(NARROW);
  const selected = cards.find((c) => c.id === selectedId)!;
  const position = visible.findIndex((c) => c.id === selectedId);
  const browsing = picked || !!inView;
  const showingCard = narrow ? !!inView : browsing;

  // Puts the cursor on a card. If one is in view, this one takes its place.
  function point(card: Card) {
    setSelectedId(card.id);
    setPicked(true);
    if (narrow && !inView) return;
    setInViewId(card.id);
    replaceAddress(cardPath(card.id));
  }

  function select(card: Card) {
    if (card.id === selectedId) return;
    point(card);
    playSelectSound();
    showOption(card.id);
  }

  function move(step: number) {
    select(visible[Math.max(0, Math.min(visible.length - 1, position + step))]);
  }

  // Picking from the list. On phones that brings the card out, as a step the back gesture undoes.
  function open(card: Card) {
    // Like pressing A in the game, picking the card that's already out still answers.
    if (card.id === selectedId && (!narrow || inView)) return playSelectSound();
    if (!narrow || inView) return select(card);
    setSelectedId(card.id);
    setPicked(true);
    setInViewId(card.id);
    flushAddress();
    window.history.pushState(null, "", cardPath(card.id));
    openedHere.current = true;
    playSelectSound();
  }

  function back() {
    flushAddress();
    if (openedHere.current) return window.history.back();
    // Arrived on the card from a link: put it away without leaving.
    setInViewId(null);
    window.history.replaceState(null, "", "/");
    playSelectSound();
    showOption(selectedId);
  }

  function switchPocket(step: 1 | -1) {
    const i = POCKETS.findIndex((p) => p.id === pocket);
    const next = POCKETS[(i + step + POCKETS.length) % POCKETS.length].id;
    const shelf = shelve(cards, next, sort);
    const keep = shelf.some((c) => c.id === selectedId);
    setPocket(next);
    playSelectSound();
    if (!keep) point(shelf[0]);
    showOption(keep ? selectedId : shelf[0].id);
  }

  function cycleSort() {
    const i = SORTS.findIndex((s) => s.id === sort);
    setSort(SORTS[(i + 1) % SORTS.length].id);
    playSelectSound();
    showOption(selectedId);
  }

  // Like a game, the arrow keys work from anywhere: up and down move the cursor,
  // left and right switch sections, Escape puts the card back. Controls that use
  // arrows themselves keep them.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable='true']")) return;
    const actions: Record<string, () => void> = {
      ArrowDown: () => move(1),
      ArrowUp: () => move(-1),
      ArrowRight: () => switchPocket(1),
      ArrowLeft: () => switchPocket(-1),
      Home: () => move(-visible.length),
      End: () => move(visible.length),
    };
    if (narrow && inView) actions.Escape = back;
    const action = actions[e.key];
    if (!action) return;
    e.preventDefault();
    action();
  });

  // The back gesture, and forward again: the card goes away or comes back out.
  const onHistory = useEffectEvent(() => {
    // An update still waiting was for the page just left.
    if (pendingAddress) clearTimeout(pendingAddress.timer);
    pendingAddress = null;
    const card = cards.find((c) => c.id === cardIdIn(window.location.pathname));
    setInViewId(card?.id ?? null);
    if (card) setSelectedId(card.id);
    if (!narrow) return;
    playSelectSound();
    showOption(card?.id ?? selectedId);
  });

  useEffect(() => {
    loadSounds();
    const keys = (e: KeyboardEvent) => onKey(e);
    const history = () => onHistory();
    window.addEventListener("keydown", keys);
    window.addEventListener("popstate", history);
    return () => {
      window.removeEventListener("keydown", keys);
      window.removeEventListener("popstate", history);
    };
  }, []);

  return (
    <div data-view={inView ? "card" : "list"} className="mart group relative h-dvh overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="mart-wall" />
        <div className="gba-sprite mart-counter absolute top-0 left-0" />
        <div className="gba-sprite mart-shelf absolute" />
      </div>

      {/* Phones: the Mart above the message box and the list, or the card above the message box. */}
      <div className="relative grid h-full grid-rows-[calc(72*var(--px))_auto_minmax(0,1fr)] gap-[calc(4*var(--px))] p-[calc(4*var(--px))] group-data-[view=card]:grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_var(--list-width)] lg:grid-rows-[minmax(0,1fr)_auto]">
        <section
          aria-label={`Showing ${selected.name}`}
          className="relative min-h-0 lg:col-start-1 lg:grid lg:grid-cols-[calc(136*var(--px))_minmax(0,1fr)] lg:gap-[calc(4*var(--px))]"
        >
          <CardData card={selected} className="hidden self-end lg:block" />
          <div className="relative h-full max-lg:group-data-[view=list]:hidden">
            <CardStage
              cards={cards}
              index={cards.indexOf(selected)}
              priority
              fill={narrow ? 0.86 : 0.78}
              lift={0.02}
              sizes="(min-width: 1024px) 420px, 90vw"
              // The card is a photo, not pixel art: scale it smoothly.
              className="absolute inset-0 [image-rendering:auto]"
            />
            <div className="absolute bottom-0 left-0 lg:hidden">
              <button type="button" onClick={back} className="gba-window gba-focus px-[calc(2*var(--px))] outline-none">
                ←BACK
              </button>
            </div>
            {/* Flip through the list without going back to it. */}
            <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between lg:hidden">
              <StepArrow direction="left" hidden={position <= 0} onClick={() => move(-1)} />
              <StepArrow direction="right" hidden={position >= visible.length - 1} onClick={() => move(1)} />
            </div>
          </div>
          <div className="absolute top-0 right-0">
            <SoundToggle />
          </div>
        </section>

        <DialogBox
          key={showingCard ? selected.id : browsing ? "anything-else" : "greeting"}
          pages={showingCard ? describe(selected) : browsing ? anythingElse() : greeting(cards.length)}
          className="lg:col-start-1"
        />

        <ItemList
          cards={visible}
          selectedId={selectedId}
          onSelect={open}
          pocket={pocket}
          onPocket={switchPocket}
          sort={sort}
          onSort={cycleSort}
          checkedOn={checkedOn}
          className="max-lg:group-data-[view=card]:hidden lg:col-start-2 lg:row-span-2 lg:row-start-1"
        />
      </div>

      {/* The shop's name arrives like a town's, on the sign that slides in and away. */}
      <p aria-hidden className="mart-popup pointer-events-none absolute top-0 left-0 text-center font-narrow">
        TOPLOADER MART
      </p>
    </div>
  );
}

function StepArrow({ direction, hidden, onClick }: { direction: "left" | "right"; hidden: boolean; onClick: () => void }) {
  if (hidden) return <span />;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "left" ? "Previous card" : "Next card"}
      className="gba-focus pointer-events-auto grid h-[calc(32*var(--px))] w-[calc(16*var(--px))] place-items-center outline-none"
    >
      <span data-dir={direction} className="gba-sprite gba-pocket-arrow" />
    </button>
  );
}
