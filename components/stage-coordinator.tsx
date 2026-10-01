"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/** Lets the card drawer pause the hero's WebGL loop while it sits on top. */
const InspectingContext = createContext<{
  inspecting: boolean;
  setInspecting: (v: boolean) => void;
}>({ inspecting: false, setInspecting: () => {} });

export function StageCoordinator({ children }: { children: ReactNode }) {
  const [inspecting, setInspecting] = useState(false);
  return (
    <InspectingContext.Provider value={{ inspecting, setInspecting }}>
      {children}
    </InspectingContext.Provider>
  );
}

export const useInspecting = () => useContext(InspectingContext);
