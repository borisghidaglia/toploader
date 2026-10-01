"use client";

import { useEffect, useState } from "react";
import { SPEAKER_OFF, SPEAKER_ON } from "@/lib/pixel-art";
import { startMusic, stopMusic } from "@/lib/sound";

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
      aria-label="Music"
      title="Music: “Shop” from Pokémon Emerald"
      className="gba-window gba-focus flex items-center gap-[calc(4*var(--px))] px-[calc(2*var(--px))] outline-none"
    >
      <span
        className="gba-sprite h-[calc(10*var(--px))] w-[calc(12*var(--px))]"
        style={{ "--sprite": on ? SPEAKER_ON : SPEAKER_OFF } as React.CSSProperties}
      />
      <span className="hidden w-[calc(18*var(--px))] text-left lg:inline">{on ? "ON" : "OFF"}</span>
    </button>
  );
}
