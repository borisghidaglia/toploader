"use client";

import { CardStage } from "@/components/holo/card-stage";
import { PriceSticker } from "@/components/price-sticker";
import { TiltButton } from "@/components/tilt-button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { CONDITION_LABEL, formatMarket, type Card } from "@/lib/cards";
import { X } from "lucide-react";

type CardDrawerProps = {
  card: Card | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClosed: () => void;
};

export function CardDrawer({ card, open, onOpenChange, onClosed }: CardDrawerProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(isOpen) => !isOpen && onClosed()}
      showSwipeHandle
    >
      <DrawerContent className="drawer-counter border-white/10 text-white [--drawer-bleed-background:var(--ink)] md:mx-auto md:max-w-xl">
        {card && (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
            <div className="relative">
              <CardStage key={card.id} cards={[card]} index={0} className="h-[min(50svh,520px)] min-h-[320px]" />
              <DrawerClose
                aria-label="Close"
                className="absolute top-2 right-3 grid size-11 place-items-center rounded-full text-white/70 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <X className="size-5" />
              </DrawerClose>
            </div>

            <div className="px-5 pt-2 pb-[max(2rem,env(safe-area-inset-bottom))]">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <DrawerTitle className="font-display text-[28px] font-extrabold leading-tight text-white [font-stretch:112%]">
                    {card.name}
                  </DrawerTitle>
                  <DrawerDescription className="mt-1 text-left text-sm text-white/65">
                    {card.set} · {card.year}
                  </DrawerDescription>
                </div>
                <PriceSticker price={card.price} size="lg" className="mt-1 shrink-0 rotate-3" />
              </div>

              <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-white/10 pt-5 text-sm">
                <Fact label="Number" value={card.number} />
                <Fact label="Condition" value={CONDITION_LABEL[card.condition]} />
                <Fact label="Rarity" value={card.rarity} />
                <Fact label="Type" value={card.type} />
                {card.illustrator && <Fact label="Illustrator" value={card.illustrator} />}
                <Fact label="Market" value={`${formatMarket(card.market)} TCGplayer`} />
              </dl>

              <div className="mt-6 flex justify-center">
                <TiltButton />
              </div>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/45">{label}</dt>
      <dd className="mt-1 truncate capitalize-first text-white/90">{value}</dd>
    </div>
  );
}
