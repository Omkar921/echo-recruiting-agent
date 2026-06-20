import type { AgentPersona } from "@/lib/types";

const AGENT_BRAND = "Écho";

function titleCaseCompany(company: string): string {
  return company.charAt(0).toUpperCase() + company.slice(1);
}

/** e.g. Google → "Google's Écho", Amazon → "Amazon's Écho" */
export function formatAgentDisplayName(companyName: string | null | undefined): string {
  const company = companyName?.trim();
  if (!company) return AGENT_BRAND;

  const display = titleCaseCompany(company);
  const possessive =
    display.endsWith("s") || display.endsWith("S") ? `${display}'` : `${display}'s`;

  return `${possessive} ${AGENT_BRAND}`;
}

export function normalizePersonaName(
  persona: AgentPersona,
  companyName?: string | null,
): AgentPersona {
  const name = formatAgentDisplayName(companyName);
  if (persona.name === name) return persona;
  return { ...persona, name };
}

export function resolveAgentDisplayName(
  companyName?: string | null,
  persona?: AgentPersona | null,
): string {
  if (companyName?.trim()) return formatAgentDisplayName(companyName);
  return persona?.name?.trim() || AGENT_BRAND;
}

export function agentAvatarLabel(): string {
  return "É";
}
