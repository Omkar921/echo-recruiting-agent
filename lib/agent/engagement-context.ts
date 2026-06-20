import {
  describeCompanyCandidateFit,
  resolveCompanyDisplayName,
  resolveIntelligence,
} from "@/lib/company/intelligence";
import type {
  AgentIntent,
  CompanyContext,
  CompanyIntelligence,
  MockCandidateProfile,
} from "@/lib/types";
import { callPurposeAgentBlock, callPurposePhaseGuide } from "@/lib/agent/call-purpose";
import { candidateFirstName } from "@/lib/candidates/mock-pool";

export function buildEngagementContextBlock(
  company: CompanyContext,
  intent: AgentIntent,
  candidate: MockCandidateProfile,
  opts?: {
    companyName?: string;
    candidateTurns?: number;
    companyIntelligence?: CompanyIntelligence | null;
  },
): string {
  const intel = resolveIntelligence(company, opts?.companyIntelligence, opts?.companyName);
  const roleText = `${intent.roleName} ${intent.jobDescription} ${intent.requirements}`;
  const fit = describeCompanyCandidateFit(company, candidate, intel, roleText);
  const display = resolveCompanyDisplayName(company, opts?.companyName);
  const firstName = candidateFirstName(candidate);
  const turns = opts?.candidateTurns ?? 0;

  const phaseGuide = callPurposePhaseGuide(
    intent.callPurpose,
    turns,
    intent.callPurposeNotes,
  );

  return [
    `── ENGAGEMENT INTELLIGENCE (read every turn) ──`,
    callPurposeAgentBlock(intent),
    ``,
    intel.recruiterBrief,
    ``,
    fit.narrative,
    ``,
    `Company: ${display}`,
    `What they build: ${intel.whatTheyBuild}`,
    `Who they hire: ${company.profilesWeHire}`,
    `Culture / tone: ${company.culture} · ${company.tone}`,
    `Role: ${intent.roleName}`,
    `Candidate: ${firstName} (${candidate.headline})`,
    `Match quality for ${display}: ${fit.isStrongMatch ? "strong — speak as if they belong in this company's world" : "partial — be curious, ask relevant questions about fit for " + display}`,
    ``,
    phaseGuide,
    ``,
    `Goal (long-term): ${intent.goal}`,
    `Requirements: ${intent.requirements || "none specified"}`,
    `── end intelligence ──`,
  ].join("\n");
}
