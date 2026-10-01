"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { Card } from "@/lib/cards";
import { cn } from "@/lib/utils";
import { createStageInput } from "./card-scene";

const CardScene = dynamic(() => import("./card-scene"), { ssr: false });

type CardStageProps = {
  cards: Card[];
  index: number;
  /** Pause rendering, e.g. while something covers the stage. */
  paused?: boolean;
  priority?: boolean;
  className?: string;
};

/**
 * A 3D card you can turn with a finger, the mouse, the arrow keys or by tilting
 * the phone. Shows the flat scan until WebGL is ready, and if it never is.
 */
export function CardStage({ cards, index, paused = false, priority, className }: CardStageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const input = useRef(createStageInput());
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const drag = useRef<{ id: number; x: number } | null>(null);
  const card = cards[index];

  useEffect(() => {
    const el = ref.current!;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    io.observe(el);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => (input.current.reducedMotion = motion.matches);
    syncMotion();
    motion.addEventListener("change", syncMotion);
    return () => {
      io.disconnect();
      motion.removeEventListener("change", syncMotion);
    };
  }, []);

  const onReady = useCallback(() => setReady(true), []);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    drag.current = { id: e.pointerId, x: e.clientX };
    input.current.dragging = true;
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse") {
      const r = e.currentTarget.getBoundingClientRect();
      input.current.hover = {
        x: ((e.clientX - r.left) / r.width) * 2 - 1,
        y: ((e.clientY - r.top) / r.height) * 2 - 1,
      };
    }
    const d = drag.current;
    if (d && d.id === e.pointerId) {
      // Capture only once the gesture is clearly horizontal, so vertical swipes still scroll.
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      input.current.dragDx += e.clientX - d.x;
      d.x = e.clientX;
    }
  }

  function endDrag(e: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id !== e.pointerId) return;
    drag.current = null;
    input.current.dragging = false;
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      input.current.turn = e.key === "ArrowLeft" ? -1 : 1;
    }
  }

  return (
    <div
      ref={ref}
      role="img"
      aria-label={`${card.name}, ${card.set} ${card.number}. Drag, tilt or use arrow keys to turn it over.`}
      tabIndex={0}
      className={cn(
        "relative cursor-grab touch-pan-y select-none outline-none active:cursor-grabbing",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-transparent",
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") input.current.hover = null;
      }}
      onKeyDown={onKeyDown}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-500",
          ready && "opacity-0",
        )}
      >
        <div className="relative aspect-[63/88] h-[74%] max-w-[86%]">
          <Image
            src={card.image}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1024px) 420px, 70vw"
            className="rounded-[4.5%/3.3%] object-cover"
          />
        </div>
      </div>
      <div className={cn("absolute inset-0 transition-opacity duration-500", ready ? "opacity-100" : "opacity-0")}>
        <CardScene cards={cards} index={index} input={input} onReady={onReady} active={visible && !paused} />
      </div>
    </div>
  );
}
