import { formatAgentDisplayName } from "@/lib/agent/display-name";
import type { AgentPersona, CompanyContext } from "@/lib/types";

export const SESSION_STORAGE_KEY = "echo-session";
export const SESSION_VERSION = 8;

export function isCompanyContextValid(
  ctx: CompanyContext | null | undefined,
): ctx is CompanyContext {
  return Boolean(
    ctx?.whoWeAre?.trim() &&
      ctx?.culture?.trim() &&
      ctx?.profilesWeHire?.trim() &&
      ctx?.tone?.trim(),
  );
}

export function isPersonaValid(
  persona: AgentPersona | null | undefined,
): persona is AgentPersona {
  return Boolean(
    persona?.name?.trim() &&
      persona.traits?.length &&
      persona.voiceDescription?.trim() &&
      persona.speechPatterns?.sentenceLength,
  );
}

export function isAgentReady(
  company: CompanyContext | null | undefined,
  persona: AgentPersona | null | undefined,
): boolean {
  return isCompanyContextValid(company) && isPersonaValid(persona);
}

/** Stable key for the current company + agent — engagement data must match this. */
export function buildAgentSessionKey(
  companyName: string | null | undefined,
  company: CompanyContext | null | undefined,
  persona: AgentPersona | null | undefined,
): string | null {
  if (
    !companyName?.trim() ||
    !isCompanyContextValid(company) ||
    !isPersonaValid(persona)
  ) {
    return null;
  }
  return JSON.stringify({
    companyName: companyName.trim().toLowerCase(),
    whoWeAre: company.whoWeAre.trim(),
    culture: company.culture.trim(),
    profilesWeHire: company.profilesWeHire.trim(),
    tone: company.tone.trim(),
    personaName: formatAgentDisplayName(companyName),
  });
}

export function isEngagementForSession(
  intent: { sessionKey?: string } | null | undefined,
  sessionKey: string | null,
): boolean {
  if (!intent || !sessionKey) return false;
  return intent.sessionKey === sessionKey;
}
