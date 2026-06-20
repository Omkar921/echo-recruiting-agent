"use client";

import { useSyncExternalStore } from "react";
import { useEchoStore } from "@/lib/session/store";

/** Wait for Zustand persist rehydration before reading draft/session state. */
export function useStoreHydrated() {
  return useSyncExternalStore(
    (onStoreChange) => useEchoStore.persist.onFinishHydration(onStoreChange),
    () => useEchoStore.persist.hasHydrated(),
    () => false,
  );
}
