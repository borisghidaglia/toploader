"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardStage } from "@/components/holo/card-stage";
import { PriceSticker } from "@/components/price-sticker";
import { useInspecting } from "@/components/stage-coordinator";
import { TiltButton } from "@/components/tilt-button";
import { CONDITION_LABEL, type Card } from "@/lib/cards";
import { cn } from "@/lib/utils";

export function Hero({ featured, total, checkedOn }: { featured: Card[]; total: number; checkedOn: string }) {
  const [index, setIndex] = useState(0);
  const { inspecting } = useInspecting();
  const card = featured[index];
  const step = (d: number) => setIndex((i) => (i + d + featured.length) % featured.length);

  return (
    <section className="hero relative isolate overflow-hidden pb-14 text-white">
      <header className="relative z-10 px-4 pt-5 sm:px-8">
        <h1 className="masthead font-display font-black uppercase leading-[0.8] text-hero-type">
          Toploader
        </h1>
        <div className="mt-3 flex items-baseline justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.08em] text-white/60 sm:text-[11px]">
          <p>Pokémon singles</p>
          <p className="text-right">{total} cards · priced {checkedOn}</p>
        </div>
      </header>

      <CardStage
        cards={featured}
        index={index}
        paused={inspecting}
        priority
        className="-mt-[4vw] h-[min(58svh,620px)] min-h-[380px] sm:-mt-[5vw] sm:h-[min(70svh,680px)]"
      />

      <div className="relative z-10 mx-auto flex max-w-md items-center gap-3 px-4">
        <Button
          variant="ghost"
          size="icon-lg"
          onClick={() => step(-1)}
          aria-label="Previous card"
          className="size-11 shrink-0 rounded-full text-white/80 hover:bg-white/10 hover:text-white"
        >
          <ChevronLeft />
        </Button>

        <div className="min-w-0 flex-1 text-center" aria-live="polite">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/50">
            On the counter
          </p>
          <h2 className="mt-1.5 font-display text-[26px] font-extrabold leading-[1.05] text-balance">
            {card.name}
          </h2>
          <p className="mt-1 truncate text-sm text-white/65">
            {card.set} · {card.number} · {CONDITION_LABEL[card.condition]}
          </p>
          <PriceSticker price={card.price} size="lg" className="mt-4 -rotate-3" />
        </div>

        <Button
          variant="ghost"
          size="icon-lg"
          onClick={() => step(1)}
          aria-label="Next card"
          className="size-11 shrink-0 rounded-full text-white/80 hover:bg-white/10 hover:text-white"
        >
          <ChevronRight />
        </Button>
      </div>

      <div className="relative z-10 mt-6 flex flex-col items-center gap-3">
        <div className="flex gap-1.5" aria-hidden>
          {featured.map((c, i) => (
            <span
              key={c.id}
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                i === index ? "w-6 bg-white" : "w-1.5 bg-white/30",
              )}
            />
          ))}
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">Drag the card to flip it</p>
        <TiltButton />
      </div>
    </section>
  );
}
