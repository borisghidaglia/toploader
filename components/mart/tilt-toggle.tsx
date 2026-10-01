"use client";

import { requestTilt, useTiltStatus } from "@/hooks/use-device-tilt";

/** Only iOS asks before sharing motion data; everywhere else this renders nothing. */
export function TiltToggle() {
  const status = useTiltStatus();
  if (status !== "needs-permission") return null;

  return (
    <button
      type="button"
      onClick={requestTilt}
      className="gba-window gba-focus h-[calc(18*var(--px))] px-2 text-[24px] leading-none outline-none"
    >
      TILT
    </button>
  );
}
