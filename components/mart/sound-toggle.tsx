"use client";

import { useEffect, useState } from "react";
import { startMusic, stopMusic } from "@/lib/sound";
import { cn } from "@/lib/utils";

export function SoundToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => stopMusic, []);

  function toggle() {
    if (on) {
      stopMusic();
      setOn(false);
      return;
    }
    setOn(true);
    startMusic().catch(() => setOn(false));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label="Sound"
      title="Music: “Shop” from Pokémon Emerald"
      className="gba-window gba-focus flex h-[calc(18*var(--px))] items-center gap-2 px-2 outline-none"
    >
      <span
        className={cn(
          "gba-sprite h-[calc(9*var(--px))] w-[calc(11*var(--px))]",
          on ? "[--sprite:var(--speaker-on)]" : "[--sprite:var(--speaker-off)]",
        )}
      />
      <span className="hidden w-[2.2em] text-left text-[24px] leading-none lg:inline">{on ? "ON" : "OFF"}</span>
    </button>
  );
}
