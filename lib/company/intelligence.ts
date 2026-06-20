import { callStructured } from "@/lib/ai/claude-client";
import type { CompanyContext, CompanyIntelligence, MockCandidateProfile } from "@/lib/types";

const STOPWORDS = new Set([
  "about", "also", "and", "are", "been", "being", "both", "but", "can", "company",
  "for", "from", "have", "help", "into", "just", "like", "more", "most", "not",
  "our", "that", "the", "their", "them", "they", "this", "through", "very", "what",
  "when", "where", "which", "with", "would", "your", "will", "work", "works",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,./\-–—·()]+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
}

export function resolveCompanyDisplayName(
  company?: CompanyContext,
  companyName?: string,
): string {
  if (companyName?.trim()) return companyName.trim();
  const first = company?.whoWeAre.split(/[—–,\n·]/)[0]?.trim();
  return first?.slice(0, 48) ?? "this company";
}

/** Heuristic fallback — derives signals from whatever the user configured, no brand lookup tables. */
export function deriveCompanyIntelligenceFallback(
  company: CompanyContext,
  companyName?: string,
): CompanyIntelligence {
  const displayName = resolveCompanyDisplayName(company, companyName);
  const corpus = `${company.whoWeAre} ${company.profilesWeHire} ${company.culture} ${company.tone}`;
  const tokens = [...new Set(tokenize(corpus))];

  const idealCandidateTraits = tokenize(company.profilesWeHire).slice(0, 12);
  const domainAndStackSignals = tokenize(`${company.whoWeAre} ${company.profilesWeHire}`).slice(0, 14);
  const cultureSignals = tokenize(`${company.culture} ${company.tone}`).slice(0, 10);

  return {
    displayName,
    whatTheyBuild: company.whoWeAre.trim(),
    idealCandidateTraits: idealCandidateTraits.length ? idealCandidateTraits : tokens.slice(0, 8),
    domainAndStackSignals: domainAndStackSignals.length ? domainAndStackSignals : tokens.slice(0, 10),
    cultureSignals: cultureSignals.length ? cultureSignals : tokens.slice(0, 6),
    recruiterBrief: `${displayName}: ${company.whoWeAre.split(/[.!?\n]/)[0]?.trim() ?? company.whoWeAre}. They hire ${company.profilesWeHire.split(/[.!?\n]/)[0]?.trim() ?? "people who fit their culture"}. Outreach tone: ${company.tone.split(/[.!?\n]/)[0]?.trim() ?? company.tone}.`,
  };
}

export async function resolveCompanyIntelligence(
  company: CompanyContext,
  companyName?: string,
): Promise<CompanyIntelligence> {
  const displayName = resolveCompanyDisplayName(company, companyName);

  const result = await callStructured<Omit<CompanyIntelligence, "displayName">>({
    system: [
      "You distill company-specific hiring intelligence for an autonomous recruiting agent.",
      "Read ONLY what the user configured about this company — do not assume it is a famous brand unless the text says so.",
      "Extract concrete, reusable signals (skills, domains, culture, stack, stage) that apply to ANY company in any industry.",
      "Never default to generic big-tech assumptions. A robotics startup and a hospital SaaS company should look completely different.",
    ].join(" "),
    prompt: [
      `Company name: ${displayName}`,
      ``,
      `Who they are: ${company.whoWeAre}`,
      `Culture: ${company.culture}`,
      `Profiles they hire: ${company.profilesWeHire}`,
      `Desired outreach tone: ${company.tone}`,
      ``,
      `Return:`,
      `- whatTheyBuild: one sentence on what this company actually does`,
      `- idealCandidateTraits: 5-10 traits/skills/experiences this company wants (from their text)`,
      `- domainAndStackSignals: 5-12 domain, product, or technical signals from their context`,
      `- cultureSignals: 3-8 culture/tone signals for how to speak as their recruiter`,
      `- recruiterBrief: 2-3 sentences an autonomous agent should internalize — who ${displayName} is, who they hire, how to sound`,
    ].join("\n"),
    toolName: "distill_company_intelligence",
    toolDescription: "Distill company-specific hiring intelligence from onboarding context.",
    schema: {
      type: "object",
      properties: {
        whatTheyBuild: { type: "string" },
        idealCandidateTraits: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 12 },
        domainAndStackSignals: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 14 },
        cultureSignals: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 10 },
        recruiterBrief: { type: "string" },
      },
      required: [
        "whatTheyBuild",
        "idealCandidateTraits",
        "domainAndStackSignals",
        "cultureSignals",
        "recruiterBrief",
      ],
    },
    maxTokens: 1200,
  });

  return { displayName, ...result };
}

export function companyIntelligenceBlock(intelligence: CompanyIntelligence): string {
  return [
    `── COMPANY INTELLIGENCE (this agent works ONLY for ${intelligence.displayName}) ──`,
    intelligence.recruiterBrief,
    `- What they build: ${intelligence.whatTheyBuild}`,
    `- Ideal candidate signals: ${intelligence.idealCandidateTraits.join("; ")}`,
    `- Domain / stack signals: ${intelligence.domainAndStackSignals.join("; ")}`,
    `- Culture / voice signals: ${intelligence.cultureSignals.join("; ")}`,
    `Every message must reflect THIS company's world — not generic recruiter scripts or assumptions about famous brands.`,
    `── end company intelligence ──`,
  ].join("\n");
}

function candidateCorpus(candidate: MockCandidateProfile): string {
  return `${candidate.tags.join(" ")} ${candidate.highlight} ${candidate.experience} ${candidate.headline} ${candidate.priorEmployers ?? ""}`.toLowerCase();
}

export function scoreCandidateForCompany(
  candidate: MockCandidateProfile,
  intelligence: CompanyIntelligence,
  roleText: string,
): number {
  const corpus = candidateCorpus(candidate);
  const signals = [
    ...intelligence.idealCandidateTraits,
    ...intelligence.domainAndStackSignals,
    ...tokenize(roleText),
  ];
  let hits = 0;
  for (const signal of signals) {
    const s = signal.toLowerCase().trim();
    if (s.length > 3 && corpus.includes(s)) hits++;
  }
  return hits;
}

export function hasStrongCompanyFit(
  candidate: MockCandidateProfile,
  intelligence: CompanyIntelligence,
  roleText: string,
): boolean {
  return scoreCandidateForCompany(candidate, intelligence, roleText) >= 4;
}

export function matchedSignals(
  candidate: MockCandidateProfile,
  intelligence: CompanyIntelligence,
): string[] {
  const corpus = candidateCorpus(candidate);
  return [...intelligence.idealCandidateTraits, ...intelligence.domainAndStackSignals].filter(
    (s) => s.length > 3 && corpus.includes(s.toLowerCase()),
  );
}

export function tailorCandidateHighlight(
  candidate: MockCandidateProfile,
  intelligence: CompanyIntelligence,
  roleText: string,
): string {
  const overlap = matchedSignals(candidate, intelligence);
  const strong = hasStrongCompanyFit(candidate, intelligence, roleText);

  if (strong && overlap.length) {
    return `${candidate.highlight} — aligns with ${intelligence.displayName}'s focus on ${overlap.slice(0, 3).join(", ")}.`;
  }
  if (strong) {
    return `${candidate.highlight} — background maps well to what ${intelligence.displayName} builds and who they hire.`;
  }
  if (overlap.length) {
    return `${candidate.highlight} — some overlap (${overlap.slice(0, 2).join(", ")}); explore fit for ${intelligence.displayName}'s stack and culture.`;
  }
  return `${candidate.highlight} — adjacent profile; ask smart questions about fit for ${intelligence.displayName}.`;
}

export function describeCompanyCandidateFit(
  company: CompanyContext,
  candidate: MockCandidateProfile,
  intelligence: CompanyIntelligence,
  roleText: string,
): { companyName: string; isStrongMatch: boolean; narrative: string } {
  const display = intelligence.displayName;
  const strong = hasStrongCompanyFit(candidate, intelligence, roleText);
  const overlap = matchedSignals(candidate, intelligence);
  const tailored = tailorCandidateHighlight(candidate, intelligence, roleText);

  const narrative = strong
    ? `${candidate.name} looks like a strong fit for ${display} because ${intelligence.whatTheyBuild} ${overlap.length ? `Their background touches: ${overlap.join(", ")}.` : ""} Recruit as someone who would understand ${display}'s product and culture — reference ${intelligence.domainAndStackSignals.slice(0, 2).join(" or ")} naturally, not generic big-company tropes.`
    : `${candidate.name} is a ${candidate.matchLabel} match for ${display} on ${candidate.headline}. ${tailored} ${company.profilesWeHire} Be honest if their background is adjacent — ask about interest in ${intelligence.whatTheyBuild} rather than overselling.`;

  return { companyName: display, isStrongMatch: strong, narrative };
}

export function resolveIntelligence(
  company: CompanyContext | undefined,
  intelligence: CompanyIntelligence | null | undefined,
  companyName?: string,
): CompanyIntelligence {
  if (intelligence) return intelligence;
  return deriveCompanyIntelligenceFallback(
    company ?? { whoWeAre: "", culture: "", profilesWeHire: "", tone: "" },
    companyName,
  );
}
