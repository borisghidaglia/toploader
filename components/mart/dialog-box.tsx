"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { playSelectSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

// About a letter a frame, like the game's FAST text speed.
const CHARS_PER_SECOND = 60;

/**
 * The clerk's message box. Text types out one letter at a time; a tap
 * finishes the page, or turns to the next one when there is one.
 * Mount it with a key per message so it starts from the top.
 */
export function DialogBox({ pages, className }: { pages: string[]; className?: string }) {
  const [page, setPage] = useState(0);
  const [typed, setTyped] = useState(0);
  const instant = useReducedMotion();
  const text = pages[page];
  const shown = instant ? text.length : Math.min(typed, text.length);
  const done = shown === text.length;
  const more = page < pages.length - 1;

  useEffect(() => {
    if (done || instant) return;
    const id = setInterval(() => setTyped((n) => n + 1), 1000 / CHARS_PER_SECOND);
    return () => clearInterval(id);
  }, [done, instant]);

  function advance() {
    if (!done) {
      setTyped(text.length);
    } else if (more) {
      setPage(page + 1);
      setTyped(0);
      playSelectSound();
    }
  }

  return (
    <div className={cn("gba-message relative cursor-default select-none", className)} onClick={advance}>
      {/* Two lines, as in game; three on phones, which are narrower than a GBA. */}
      <p aria-hidden className="relative top-[var(--px)] min-h-[calc(48*var(--px))] lg:min-h-[calc(32*var(--px))]">
        {text.slice(0, shown)}
        {/* The rest is laid out but invisible, so words never jump lines as they type. */}
        <span className="invisible">{text.slice(shown)}</span>
        {/* The ▼ waits right after the last letter, in an 8×16 cell like the font's. */}
        <span className="relative inline-block h-[calc(16*var(--px))] w-[calc(8*var(--px))] align-top">
          {done && more && (
            <span className="gba-sprite gba-next absolute top-[calc(5*var(--px))] left-[var(--px)]" />
          )}
        </span>
      </p>
      <p className="sr-only" aria-live="polite">
        {text}
      </p>
      {done && more && (
        <button
          type="button"
          aria-label="Next message"
          onClick={(e) => {
            e.stopPropagation();
            advance();
          }}
          className="gba-focus absolute -inset-y-[calc(8*var(--px))] -inset-x-[calc(16*var(--px))] outline-none"
        />
      )}
    </div>
  );
}
