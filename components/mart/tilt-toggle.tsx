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
      className="gba-window gba-focus px-[calc(2*var(--px))] outline-none"
    >
      TILT
    </button>
  );
}
