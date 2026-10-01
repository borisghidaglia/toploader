"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { blip } from "@/lib/sound";
import { cn } from "@/lib/utils";

const CHARS_PER_SECOND = 50;

/**
 * The clerk's message box. Text types out one character at a time; a tap
 * finishes the line, or turns to the next page when there is one.
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
      blip("select");
    }
  }

  return (
    <div className={cn("gba-window relative cursor-default select-none", className)} onClick={advance}>
      <p aria-hidden className="min-h-[96px] px-3 py-1.5 text-[24px] leading-[32px] lg:min-h-[64px] lg:px-4">
        {text.slice(0, shown)}
        {/* The rest is laid out but invisible, so words never jump lines as they type. */}
        <span className="invisible">{text.slice(shown)}</span>
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
          className="gba-focus absolute right-1 bottom-0 grid size-11 place-items-center outline-none"
        >
          <span className="gba-sprite gba-next" />
        </button>
      )}
    </div>
  );
}
