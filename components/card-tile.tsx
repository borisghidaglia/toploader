"use client";

import Image from "next/image";
import type { PointerEvent } from "react";
import { PriceSticker } from "@/components/price-sticker";
import type { Card } from "@/lib/cards";

/** A card in its toploader, price sticker on the plastic. */
export function CardTile({ card, onOpen, eager }: { card: Card; onOpen: () => void; eager?: boolean }) {
  // Mouse users steer the foil with the cursor; touch gets scroll and phone tilt.
  function onPointerMove(e: PointerEvent<HTMLButtonElement>) {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
    e.currentTarget.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      onPointerMove={onPointerMove}
      onPointerLeave={(e) => {
        e.currentTarget.style.removeProperty("--mx");
        e.currentTarget.style.removeProperty("--my");
      }}
      className="tile group block w-full rounded-[14px] text-left outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4 focus-visible:ring-offset-case"
    >
      <div className="toploader relative">
        <div className="card-face relative aspect-[63/88] overflow-hidden">
          <Image
            src={card.image}
            alt=""
            fill
            loading={eager ? "eager" : "lazy"}
            sizes="(min-width: 1280px) 200px, (min-width: 1024px) 18vw, (min-width: 640px) 30vw, 46vw"
            className="object-cover"
          />
          {card.foil !== "none" && <span className="foil" data-foil={card.foil} aria-hidden />}
          <span className="glare" aria-hidden />
        </div>
        <PriceSticker price={card.price} className="absolute -top-2.5 -right-2 rotate-[5deg]" />
      </div>

      <div className="mt-3 px-1">
        <h3 className="truncate font-display text-[15px] font-extrabold leading-tight [font-stretch:92%]">
          {card.name}
        </h3>
        <p className="mt-0.5 truncate text-[13px] text-muted-ink">{card.set}</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.06em] text-muted-ink">
          {card.number} · {card.condition} · {card.year}
        </p>
      </div>
    </button>
  );
}
