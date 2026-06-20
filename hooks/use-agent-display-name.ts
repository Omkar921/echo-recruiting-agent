"use client";

import { resolveAgentDisplayName } from "@/lib/agent/display-name";
import { useEchoStore } from "@/lib/session/store";

export function useAgentDisplayName(): string {
  const companyName = useEchoStore((s) => s.profile?.companyName);
  const persona = useEchoStore((s) => s.persona);
  return resolveAgentDisplayName(companyName, persona);
}
