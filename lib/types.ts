export interface CompanyContext {
  whoWeAre: string;
  culture: string;
  profilesWeHire: string;
  tone: string;
}

/** AI-distilled hiring profile — built once at agent creation from company context. Works for any company. */
export interface CompanyIntelligence {
  displayName: string;
  whatTheyBuild: string;
  idealCandidateTraits: string[];
  domainAndStackSignals: string[];
  cultureSignals: string[];
  recruiterBrief: string;
}

export interface SpeechPatterns {
  sentenceLength: string;
  usesContractions: boolean;
  mirroringStyle: string;
  energyMatching: string;
  avoids: string[];
  exampleGoodReply: string;
  exampleBadReply: string;
}

export interface AgentPersona {
  /** Branded display name, e.g. "Google's Écho" — derived from company name, not a random persona name. */
  name: string;
  traits: string[];
  voiceDescription: string;
  sampleLine: string;
  doNots: string[];
  speechPatterns?: SpeechPatterns;
}

export interface CandidateModel {
  statedInterests: string[];
  concerns: string[];
  signals: string[];
  openQuestions: string[];
}

export const EMPTY_CANDIDATE_MODEL: CandidateModel = {
  statedInterests: [],
  concerns: [],
  signals: [],
  openQuestions: [],
};

export type CandidateRoleFamily =
  | "fullstack"
  | "frontend"
  | "backend"
  | "uiux"
  | "ai_engineer"
  | "product_engineer"
  | "product_manager"
  | "data_engineer"
  | "platform"
  | "sales"
  | "unknown";

export interface MockCandidateProfile {
  id: string;
  name: string;
  headline: string;
  location: string;
  experience: string;
  highlight: string;
  matchScore: number;
  matchLabel: "strong" | "partial" | "stretch" | "unknown";
  roleFamily: CandidateRoleFamily;
  /** Optional mock metadata — prior employer shown in highlights when relevant */
  priorEmployers?: string;
  tags: string[];
}

export type MessageRole = "agent" | "candidate";

export interface ConversationMessage {
  id: string;
  role: MessageRole;
  content: string;
  reasoning?: AgentReasoningStep;
  createdAt: string;
}

export interface AgentReasoningStep {
  classification?: string;
  interpretation?: string;
  signal?: string;
  conversationStage?: string;
  nextBeat?: string;
  decision: string;
  rationale: string;
  /** Reasoning produced by agent engine, not the LLM */
  agentDriven?: boolean;
}

export type ConversationStatus =
  | "drafting"
  | "engaging"
  | "call_proposed"
  | "nurture"
  | "not_a_fit"
  | "completed";

export interface ConversationState {
  status: ConversationStatus;
  statusReason: string;
  messages: ConversationMessage[];
}

export type CallReportVerdict = "strong_yes" | "yes" | "maybe" | "no" | "strong_no";

export interface CallReportDimension {
  key: string;
  label: string;
  score: number;
  summary: string;
}

export interface CallReport {
  callPurpose: CallPurpose;
  callPurposeLabel: string;
  candidateName: string;
  roleName: string;
  generatedAt: string;
  overallScore: number;
  verdict: CallReportVerdict;
  recommendation: string;
  /** 0–100 — intro / assessment / custom calls */
  nextRoundLikelihood?: number;
  summary: string;
  dimensions: CallReportDimension[];
  strengths: string[];
  concerns: string[];
  highlights: string[];
  turnCount: number;
}

export type CallPurpose = "intro" | "assessment" | "technical" | "other";

export interface AgentIntent {
  roleName: string;
  jobDescription: string;
  requirements: string;
  goal: string;
  callPurpose: CallPurpose;
  callPurposeNotes?: string;
  /** Ties this role to a specific company + agent config — cleared when company changes */
  sessionKey?: string;
}

export type AgentPagePhase = "intent" | "sourcing" | "pick" | "preflight" | "conversation";

export interface EngagementDraft {
  sessionKey: string;
  pagePhase: AgentPagePhase;
  roleName: string;
  jobDescription: string;
  requirements: string;
  goal: string;
  callPurpose: CallPurpose;
  callPurposeNotes: string;
  sourcing: {
    intent: AgentIntent;
    scanned: MockCandidateProfile[];
    shortlist: MockCandidateProfile[];
  } | null;
  selectedId: string | null;
  pendingEngagement: {
    intent: AgentIntent;
    candidate: MockCandidateProfile;
    sequenceResult: {
      sequence: SequenceStep[];
      openingRationale: string;
    };
  } | null;
}

export interface UserProfile {
  name: string;
  companyName: string;
  position: string;
  email: string;
}

export interface SequenceStep {
  id: string;
  goal: string;
  content: string;
}
