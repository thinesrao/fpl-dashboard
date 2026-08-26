"use client";
import { createContext, useContext, type ReactNode } from "react";

export type OverlayActions = {
  openManager: (name: string) => void;
  openTrophy: (key: string) => void;
};

const noop: OverlayActions = {
  openManager: () => {},
  openTrophy: () => {},
};

const OverlayContext = createContext<OverlayActions>(noop);

export function OverlayProvider({
  value,
  children,
}: {
  value: OverlayActions;
  children: ReactNode;
}) {
  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
}

export function useOverlay(): OverlayActions {
  return useContext(OverlayContext);
}
