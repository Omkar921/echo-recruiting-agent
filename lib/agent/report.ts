import { callStructured } from "@/lib/ai/claude-client";
import { callPurposeLabel } from "@/lib/agent/call-purpose";
import {
  includesNextRoundLikelihood,
  reportDimensionsForPurpose,
} from "@/lib/agent/report-schemas";
import { formatCandidateModel } from "@/lib/agent/prompts";
import type {
  AgentIntent,
  AgentPersona,
  CallReport,
  CallReportVerdict,
  CandidateModel,
  CompanyContext,
  ConversationMessage,
  MockCandidateProfile,
} from "@/lib/types";

const VALID_VERDICTS = new Set<CallReportVerdict>([
  "strong_yes",
  "yes",
  "maybe",
  "no",
  "strong_no",
]);

function normalizeVerdict(value: string): CallReportVerdict {
  return VALID_VERDICTS.has(value as CallReportVerdict)
    ? (value as CallReportVerdict)
    : "maybe";
}

function formatTranscript(messages: ConversationMessage[]): string {
  return messages
    .map((m) => `${m.role === "agent" ? "Recruiter" : "Candidate"}: ${m.content}`)
    .join("\n");
}

function buildReportSchema(intent: AgentIntent) {
  const dimensions = reportDimensionsForPurpose(intent.callPurpose);
  const withNextRound = includesNextRoundLikelihood(intent.callPurpose);

  const properties: Record<string, unknown> = {
    overallScore: { type: "number", description: "0-100 overall score" },
    verdict: {
      type: "string",
      enum: ["strong_yes", "yes", "maybe", "no", "strong_no"],
    },
    recommendation: { type: "string" },
    summary: { type: "string", description: "2-3 sentence executive summary" },
    strengths: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
    concerns: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
    highlights: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 3,
      description: "Best moments or quotes from the candidate",
    },
    dimensions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: { type: "string", enum: dimensions.map((d) => d.key) },
          score: { type: "number", description: "0-100" },
          summary: { type: "string", description: "One sentence evidence-based note" },
        },
        required: ["key", "score", "summary"],
      },
      minItems: dimensions.length,
      maxItems: dimensions.length,
    },
  };

  if (withNextRound) {
    properties.nextRoundLikelihood = {
      type: "number",
      description: "0-100 likelihood candidate should advance to next round",
    };
  }

  const required = [
    "overallScore",
    "verdict",
    "recommendation",
    "summary",
    "strengths",
    "concerns",
    "highlights",
    "dimensions",
    ...(withNextRound ? ["nextRoundLikelihood"] : []),
  ];

  return { properties, required, dimensions };
}

type RawReport = {
  overallScore: number;
  verdict: CallReportVerdict;
  recommendation: string;
  summary: string;
  strengths: string[];
  concerns: string[];
  highlights: string[];
  nextRoundLikelihood?: number;
  dimensions: { key: string; score: number; summary: string }[];
};

export async function generateCallReport(opts: {
  company: CompanyContext;
  persona: AgentPersona;
  intent: AgentIntent;
  messages: ConversationMessage[];
  candidateModel: CandidateModel;
  candidate: MockCandidateProfile;
  companyName?: string;
}): Promise<CallReport> {
  const { intent, messages, candidateModel, candidate, company, persona, companyName } = opts;
  const purposeLabel = callPurposeLabel(intent.callPurpose, intent.callPurposeNotes);
  const dimensionDefs = reportDimensionsForPurpose(intent.callPurpose);
  const { properties, required } = buildReportSchema(intent);
  const turnCount = messages.filter((m) => m.role === "candidate").length;

  const dimensionGuide = dimensionDefs
    .map((d) => `- ${d.key} (${d.label}): ${d.description}`)
    .join("\n");

  const raw = await callStructured<RawReport>({
    system: [
      `You are a senior hiring manager producing a post-call scorecard for ${companyName ?? "the company"}.`,
      `Be evidence-based — cite what the candidate actually said in the transcript.`,
      `Score 0-100 per dimension. Be calibrated: 70+ is solid, 85+ is exceptional, below 50 is a concern.`,
      `This was a ${purposeLabel} — score using the criteria for this call type only.`,
      persona.name
        ? `The recruiter on the call was ${persona.name}.`
        : "",
    ]
      .filter(Boolean)
      .join(" "),
    prompt: [
      `Role: ${intent.roleName}`,
      `Requirements: ${intent.requirements}`,
      `Call type: ${purposeLabel}`,
      `Candidate: ${candidate.name} — ${candidate.headline}`,
      `Background: ${candidate.highlight}`,
      ``,
      `Score each dimension (exact keys required):`,
      dimensionGuide,
      ``,
      `Agent notes from conversation:`,
      formatCandidateModel(candidateModel),
      ``,
      `Transcript:`,
      formatTranscript(messages),
      ``,
      `Produce an honest scorecard. For intro calls, include nextRoundLikelihood (0-100).`,
      `Recommendation should be one clear action: advance, hold, or pass.`,
    ].join("\n"),
    toolName: "write_call_report",
    toolDescription: "Structured post-call candidate scorecard.",
    schema: {
      type: "object",
      properties,
      required,
    },
    maxTokens: 2000,
  });

  const labelByKey = Object.fromEntries(dimensionDefs.map((d) => [d.key, d.label]));

  return {
    callPurpose: intent.callPurpose,
    callPurposeLabel: purposeLabel,
    candidateName: candidate.name,
    roleName: intent.roleName,
    generatedAt: new Date().toISOString(),
    overallScore: Math.round(Math.min(100, Math.max(0, raw.overallScore))),
    verdict: normalizeVerdict(raw.verdict),
    recommendation: raw.recommendation,
    nextRoundLikelihood:
      raw.nextRoundLikelihood !== undefined
        ? Math.round(Math.min(100, Math.max(0, raw.nextRoundLikelihood)))
        : undefined,
    summary: raw.summary,
    dimensions: raw.dimensions.map((d) => ({
      key: d.key,
      label: labelByKey[d.key] ?? d.key,
      score: Math.round(Math.min(100, Math.max(0, d.score))),
      summary: d.summary,
    })),
    strengths: raw.strengths,
    concerns: raw.concerns,
    highlights: raw.highlights,
    turnCount,
  };
}
