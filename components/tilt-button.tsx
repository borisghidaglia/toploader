"use client";

import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestTilt, useTiltStatus } from "@/hooks/use-device-tilt";

/** Only iOS asks before sharing motion data; everywhere else this renders nothing. */
export function TiltButton() {
  const status = useTiltStatus();
  if (status !== "needs-permission") return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={requestTilt}
      className="rounded-full border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
    >
      <Smartphone data-icon="inline-start" />
      Turn on tilt
    </Button>
  );
}
