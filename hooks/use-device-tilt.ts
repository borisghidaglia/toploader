"use client";

import { useSyncExternalStore } from "react";

/**
 * Phone tilt, shared by every holo on the page.
 *
 * `tilt` is a mutable vector in [-1, 1] that render loops read directly (no React
 * re-renders per sensor event). It's measured relative to a baseline that slowly
 * follows the phone, so whatever angle you hold it at becomes "neutral".
 * The same values are mirrored to `--tilt-x` / `--tilt-y` on <html> for CSS foil.
 */

type Status = "unsupported" | "needs-permission" | "active" | "denied";

type OrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

export const tilt = { x: 0, y: 0, live: false };

let status: Status = "unsupported";
let baseline: { beta: number; gamma: number } | null = null;
let listening = false;
let cssFrame = 0;
const subscribers = new Set<() => void>();

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

function setStatus(next: Status) {
  status = next;
  subscribers.forEach((fn) => fn());
}

function onOrientation(e: DeviceOrientationEvent) {
  if (e.beta == null || e.gamma == null) return;
  if (!baseline) baseline = { beta: e.beta, gamma: e.gamma };
  // Drift the neutral pose toward how the phone is being held.
  baseline.beta += (e.beta - baseline.beta) * 0.015;
  baseline.gamma += (e.gamma - baseline.gamma) * 0.015;

  tilt.x = clamp((e.gamma - baseline.gamma) / 25);
  tilt.y = clamp((e.beta - baseline.beta) / 25);
  if (!tilt.live) {
    tilt.live = true;
    if (status !== "active") setStatus("active");
  }

  if (!cssFrame) {
    cssFrame = requestAnimationFrame(() => {
      cssFrame = 0;
      const root = document.documentElement.style;
      root.setProperty("--tilt-x", tilt.x.toFixed(3));
      root.setProperty("--tilt-y", tilt.y.toFixed(3));
    });
  }
}

function listen() {
  if (listening) return;
  listening = true;
  window.addEventListener("deviceorientation", onOrientation);
}

function init() {
  if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return;
  const Orientation = DeviceOrientationEvent as OrientationEventWithPermission;
  if (typeof Orientation.requestPermission === "function") {
    // iOS: needs a tap before it will report anything.
    setStatus("needs-permission");
  } else if (window.matchMedia("(pointer: coarse)").matches) {
    // Android: events flow without asking. Status flips to "active" on the first reading.
    listen();
  }
}

let initialized = false;
function subscribe(fn: () => void) {
  if (!initialized) {
    initialized = true;
    init();
  }
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export async function requestTilt() {
  const Orientation = DeviceOrientationEvent as OrientationEventWithPermission;
  try {
    const result = await Orientation.requestPermission?.();
    if (result === "granted") {
      listen();
      setStatus("active");
    } else {
      setStatus("denied");
    }
  } catch {
    setStatus("denied");
  }
}

export function useTiltStatus() {
  return useSyncExternalStore(
    subscribe,
    () => status,
    () => "unsupported" as Status,
  );
}
