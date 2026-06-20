"use client";

import { useEffect, useRef } from "react";
import { useEchoStore } from "@/lib/session/store";

/** Clear engagement data when the company/agent session key changes or on mount. */
export function useStaleSessionPurge(sessionKey: string | null) {
  const purgeStaleEngagement = useEchoStore((s) => s.purgeStaleEngagement);

  useEffect(() => {
    if (!sessionKey) return;
    purgeStaleEngagement(sessionKey);
  }, [sessionKey, purgeStaleEngagement]);
}
