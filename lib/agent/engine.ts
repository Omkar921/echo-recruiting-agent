import { resolveCompanyDisplayName, resolveIntelligence } from "@/lib/company/intelligence";
import {
  callPurposeBridgeBeat,
  callPurposeGreetingPolicy,
  planContingencyGoalsForPurpose,
} from "@/lib/agent/call-purpose";
import { MAX_CANDIDATE_TURNS, WRAP_UP_TURN } from "@/lib/agent/constants";
import { candidateFirstName } from "@/lib/candidates/mock-pool";
import type {
  AgentIntent,
  CandidateModel,
  CompanyContext,
  CompanyIntelligence,
  ConversationStatus,
  MockCandidateProfile,
  SequenceStep,
} from "@/lib/types";

export type ReplyClassification =
  | "greeting"
  | "question"
  | "objection"
  | "interest"
  | "rejection"
  | "logistics"
  | "neutral";

export type ConversationPhase =
  | "opening"
  | "rapport"
  | "bridge"
  | "exploring"
  | "qualifying"
  | "objection"
  | "closing";

export interface TurnAnalysis {
  candidateModel: CandidateModel;
  literalMeaning: string;
  likelyIntent: string;
  emotionalTone: string;
  whatTheyNeed: string;
  interestLevel: "low" | "medium" | "high";
  replyStyle: "one-word" | "brief" | "detailed" | "question" | "pushback";
  classification: ReplyClassification;
  phase: ConversationPhase;
}

export interface AgentDecision {
  classification: string;
  signal: string;
  status: ConversationStatus;
  statusReason: string;
  conversationStage: ConversationPhase;
  nextBeat: string;
  decision: string;
  rationale: string;
  matchedSequenceStep?: string;
}

function mergeUnique(existing: string[], added: string[]): string[] {
  const set = new Set(existing.map((s) => s.toLowerCase()));
  const out = [...existing];
  for (const item of added) {
    if (!set.has(item.toLowerCase())) {
      out.push(item);
      set.add(item.toLowerCase());
    }
  }
  return out;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function excerpt(text: string, max = 80): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export function classifyReply(text: string): ReplyClassification {
  const lower = text.toLowerCase().trim();

  if (
    /\b(not interested|no thanks|no thank you|pass on|don't reach|stop contacting|leave me alone|wrong person)\b/.test(
      lower,
    )
  )
    return "rejection";
  if (
    /\b(too low|can't do|won't do|dealbreaker|not open|not looking|happy where|already accepted|signed elsewhere)\b/.test(
      lower,
    )
  )
    return "objection";
  if (/\?/.test(text) || /^(what|how|when|where|why|who|which|can you|could you|is it|are you|do you)\b/i.test(lower))
    return "question";
  if (
    /\b(yes|yeah|sure|sounds good|interested|tell me more|open to|would love|let's chat|happy to|works for me)\b/.test(
      lower,
    )
  )
    return "interest";
  if (
    /\b(remote|hybrid|onsite|on-site|salary|comp|compensation|visa|timezone|location|relocation|benefits|equity|start date)\b/.test(
      lower,
    )
  )
    return "logistics";
  if (
    /\b(good|great|fine|well|thanks|thank you|doing ok|not bad|pretty good|hey|hi|hello|morning|afternoon)\b/.test(
      lower,
    ) &&
    wordCount(text) <= 12
  )
    return "greeting";

  return "neutral";
}

export function replyStyle(text: string): TurnAnalysis["replyStyle"] {
  const wc = wordCount(text);
  if (wc <= 2) return "one-word";
  if (wc <= 8) return "brief";
  if (/\?/.test(text)) return "question";
  if (/\b(but|however|not sure|concern|worried|issue)\b/i.test(text)) return "pushback";
  return "detailed";
}

export function inferInterest(
  classification: ReplyClassification,
  style: TurnAnalysis["replyStyle"],
  model: CandidateModel,
): TurnAnalysis["interestLevel"] {
  if (classification === "rejection" || classification === "objection") return "low";
  if (classification === "interest") return "high";
  if (classification === "question" || classification === "logistics") return "medium";
  if (model.statedInterests.length >= 2) return "high";
  if (model.concerns.length >= 2) return "low";
  if (style === "one-word" || style === "brief") return "medium";
  return "medium";
}

export function inferTone(classification: ReplyClassification, text: string): string {
  if (classification === "rejection") return "closed off";
  if (classification === "objection") return "skeptical";
  if (classification === "interest") return "positive";
  if (classification === "greeting") return "polite";
  if (classification === "question") return "curious";
  if (/\b(sorry|busy|hectic|crazy week)\b/i.test(text)) return "hurried";
  return "neutral";
}

export function resolvePhase(
  candidateTurns: number,
  classification: ReplyClassification,
  callPurpose: AgentIntent["callPurpose"] = "intro",
): ConversationPhase {
  if (callPurpose === "technical") {
    if (candidateTurns <= 1) return "rapport";
    if (candidateTurns === 2) return "qualifying";
    return classification === "objection" || classification === "rejection" ? "objection" : "qualifying";
  }
  if (callPurpose === "assessment") {
    if (candidateTurns <= 1) return "rapport";
    if (candidateTurns === 2) return "bridge";
    return classification === "objection" || classification === "rejection" ? "objection" : "qualifying";
  }

  if (candidateTurns <= 1) return "rapport";
  if (candidateTurns === 2) return "bridge";
  if (classification === "objection" || classification === "rejection") return "objection";
  if (classification === "interest" || classification === "logistics") return "qualifying";
  if (candidateTurns >= 4) return "exploring";
  return "exploring";
}

export function updateCandidateModel(
  reply: string,
  existing: CandidateModel,
  classification: ReplyClassification,
): CandidateModel {
  const lower = reply.toLowerCase();
  const model = { ...existing };

  if (classification === "interest") {
    model.statedInterests = mergeUnique(model.statedInterests, [excerpt(reply, 100)]);
  }
  if (classification === "objection" || classification === "rejection") {
    model.concerns = mergeUnique(model.concerns, [excerpt(reply, 100)]);
  }
  if (classification === "logistics") {
    model.signals = mergeUnique(model.signals, [excerpt(reply, 100)]);
  }
  if (classification === "question") {
    model.openQuestions = mergeUnique(model.openQuestions, [excerpt(reply, 120)]);
  }
  if (/\b(remote|hybrid|onsite)\b/i.test(lower)) {
    model.signals = mergeUnique(model.signals, ["Mentioned work arrangement preference"]);
  }
  if (/\b(salary|comp|compensation|\$\d)\b/i.test(lower)) {
    model.signals = mergeUnique(model.signals, ["Asked about compensation"]);
  }

  return model;
}

function matchSequenceStep(
  sequence: SequenceStep[],
  classification: ReplyClassification,
  phase: ConversationPhase,
): SequenceStep | undefined {
  const hints: Record<ReplyClassification, string[]> = {
    greeting: ["follow", "silent", "no reply"],
    question: ["question", "clarif", "info"],
    objection: ["objection", "pushback", "concern"],
    interest: ["interest", "positive", "qualif"],
    rejection: ["close", "not a fit", "decline"],
    logistics: ["logistics", "comp", "remote", "qualif"],
    neutral: ["follow", "engage"],
  };

  const keys = [...hints[classification], phase];
  return sequence.find((s) => {
    const g = s.goal.toLowerCase();
    return keys.some((k) => g.includes(k));
  });
}

function detectDealbreaker(reply: string, requirements: string): boolean {
  const lower = reply.toLowerCase();
  if (/\b(dealbreaker|won't consider|not open to|can't do|must be remote only)\b/.test(lower)) return true;
  if (/\b(not interested|wrong fit|pass)\b/.test(lower)) return true;
  if (requirements && /\bremote only\b/i.test(requirements) && /\b(must be onsite|office only)\b/i.test(lower))
    return true;
  return false;
}

export interface DecideContext {
  intent: AgentIntent;
  company: CompanyContext;
  candidate?: MockCandidateProfile;
  companyName?: string;
  companyIntelligence?: CompanyIntelligence | null;
  candidateTurns: number;
  candidateReply: string;
  candidateModel: CandidateModel;
  sequence: SequenceStep[];
}

export function analyzeTurn(ctx: DecideContext): TurnAnalysis {
  const classification = classifyReply(ctx.candidateReply);
  const replyStyleVal = replyStyle(ctx.candidateReply);
  const phase = resolvePhase(ctx.candidateTurns, classification, ctx.intent.callPurpose);
  const candidateModel = updateCandidateModel(ctx.candidateReply, ctx.candidateModel, classification);
  const interestLevel = inferInterest(classification, replyStyleVal, candidateModel);
  const emotionalTone = inferTone(classification, ctx.candidateReply);

  const literalMeaning = excerpt(ctx.candidateReply, 120);
  const likelyIntent = intentLabel(classification, ctx.candidateReply);
  const whatTheyNeed = needLabel(classification, phase, interestLevel);

  return {
    candidateModel,
    literalMeaning,
    likelyIntent,
    emotionalTone,
    whatTheyNeed,
    interestLevel,
    replyStyle: replyStyleVal,
    classification,
    phase,
  };
}

function intentLabel(classification: ReplyClassification, text: string): string {
  switch (classification) {
    case "greeting":
      return "Being polite and opening the conversation";
    case "question":
      return "Seeking information before committing";
    case "objection":
      return "Raising a concern or barrier";
    case "interest":
      return "Showing openness to the opportunity";
    case "rejection":
      return "Declining or closing the door";
    case "logistics":
      return "Checking practical fit (comp, location, arrangement)";
    default:
      return wordCount(text) <= 6 ? "Brief acknowledgment" : "Continuing the conversation";
  }
}

function needLabel(
  classification: ReplyClassification,
  phase: ConversationPhase,
  interest: TurnAnalysis["interestLevel"],
): string {
  if (classification === "rejection") return "A respectful close, no pressure";
  if (classification === "objection") return "Honest answer, then re-engagement if fair";
  if (classification === "question") return "Direct answer to their question first";
  if (phase === "rapport") return "Warm acknowledgment before any pitch";
  if (phase === "bridge") return "Natural bridge from rapport into why you reached out";
  if (interest === "high") return "Move toward the engagement goal";
  return "Keep conversation moving with one clear next step";
}

export function decideNextAction(analysis: TurnAnalysis, ctx: DecideContext): AgentDecision {
  const intel = resolveIntelligence(ctx.company, ctx.companyIntelligence, ctx.companyName);
  const display = resolveCompanyDisplayName(ctx.company, ctx.companyName);
  const firstName = ctx.candidate ? candidateFirstName(ctx.candidate) : "them";
  const signal = excerpt(ctx.candidateReply, 60);
  const matched = matchSequenceStep(ctx.sequence, analysis.classification, analysis.phase);

  if (detectDealbreaker(ctx.candidateReply, ctx.intent.requirements)) {
    return {
      classification: analysis.classification,
      signal,
      status: "not_a_fit",
      statusReason: "Candidate signaled a clear mismatch or disinterest",
      conversationStage: "closing",
      nextBeat: `Thank ${firstName} respectfully and close — no further pitch`,
      decision: "Close the engagement respectfully",
      rationale: `Their reply ("${signal}") conflicts with requirements or indicates they're not open. Agent policy: don't push.`,
      matchedSequenceStep: matched?.goal ?? "none",
    };
  }

  if (analysis.classification === "rejection") {
    return {
      classification: analysis.classification,
      signal,
      status: "nurture",
      statusReason: "Candidate declined for now — leave door open",
      conversationStage: "closing",
      nextBeat: `Acknowledge their position warmly and leave a light door open for ${display}`,
      decision: "Close without pressure",
      rationale: "Hard no detected. Agent moves to nurture/close rather than pushing.",
      matchedSequenceStep: matched?.goal ?? "none",
    };
  }

  if (ctx.candidateTurns >= MAX_CANDIDATE_TURNS) {
    return {
      classification: analysis.classification,
      signal,
      status: "completed",
      statusReason: "Call complete — interview length reached",
      conversationStage: "closing",
      nextBeat: `Thank ${firstName} for their time. Briefly acknowledge "${signal}", say the team will follow up, and close warmly — no new questions.`,
      decision: "Close the call",
      rationale: `Turn ${ctx.candidateTurns}: agent policy — ${MAX_CANDIDATE_TURNS}-exchange limit reached. Wrap up.`,
      matchedSequenceStep: matched?.goal ?? "none",
    };
  }

  if (ctx.candidateTurns >= WRAP_UP_TURN) {
    return {
      classification: analysis.classification,
      signal,
      status: "engaging",
      statusReason: "Winding down — final exchange",
      conversationStage: "closing",
      nextBeat: `Respond to "${signal}" briefly. Ask at most ONE short final question for this ${ctx.intent.callPurpose} call, OR start closing if you already have enough signal.`,
      decision: "Begin wrap-up",
      rationale: `Turn ${ctx.candidateTurns}: agent policy — start closing within ${MAX_CANDIDATE_TURNS} exchanges.`,
      matchedSequenceStep: matched?.goal ?? "none",
    };
  }

  if (analysis.phase === "rapport") {
    let nextBeat: string;
    if (ctx.intent.callPurpose === "technical") {
      nextBeat = `Mirror "${signal}" briefly, frame this as a technical conversation for ${ctx.intent.roleName} at ${display}`;
    } else if (ctx.intent.callPurpose === "assessment") {
      nextBeat = `Mirror "${signal}" warmly, set expectation that you'll explore fit for ${ctx.intent.roleName} at ${display}`;
    } else if (ctx.intent.callPurpose === "intro") {
      nextBeat = `Mirror their mood ("${signal}") with warmth — one human follow-up, no heavy evaluation yet`;
    } else {
      nextBeat = `Mirror "${signal}", align to the custom call purpose for ${ctx.intent.roleName}`;
    }
    return {
      classification: analysis.classification,
      signal,
      status: "engaging",
      statusReason: `Building rapport for ${ctx.intent.callPurpose} call`,
      conversationStage: "rapport",
      nextBeat,
      decision: "Acknowledge and frame the call type",
      rationale: `Turn ${ctx.candidateTurns}: agent ${ctx.intent.callPurpose} call policy — rapport before depth.`,
      matchedSequenceStep: matched?.goal ?? "none",
    };
  }

  if (analysis.phase === "bridge") {
    const hook = ctx.candidate?.highlight ?? "their background";
    return {
      classification: analysis.classification,
      signal,
      status: "engaging",
      statusReason: `Bridging into ${ctx.intent.callPurpose} call focus`,
      conversationStage: "bridge",
      nextBeat: callPurposeBridgeBeat(
        ctx.intent.callPurpose,
        ctx.intent.roleName,
        hook,
        display,
      ),
      decision: "Bridge into call purpose",
      rationale: `Turn ${ctx.candidateTurns}: agent policy for ${ctx.intent.callPurpose} call — connect background to ${intel.whatTheyBuild}.`,
      matchedSequenceStep: matched?.goal ?? "none",
    };
  }

  if (analysis.classification === "question" || analysis.classification === "logistics") {
    const topic =
      analysis.classification === "logistics"
        ? "their logistics question (comp, remote, location, etc.)"
        : "their question";
    return {
      classification: analysis.classification,
      signal,
      status: "engaging",
      statusReason: "Answering a candidate question before advancing",
      conversationStage: "qualifying",
      nextBeat: `Answer ${topic} honestly for ${display}, then one question to keep momentum toward: ${ctx.intent.goal}`,
      decision: "Answer first, then re-engage",
      rationale: "Agent policy: questions get direct answers before any pitch escalation.",
      matchedSequenceStep: matched?.goal ?? "none",
    };
  }

  if (analysis.classification === "objection") {
    return {
      classification: analysis.classification,
      signal,
      status: "engaging",
      statusReason: "Handling objection — address then re-engage",
      conversationStage: "objection",
      nextBeat: `Address their concern ("${signal}") honestly for ${display}, then ask if they'd still be open to a short chat`,
      decision: "Handle objection and re-engage",
      rationale: "Agent detected pushback. Address before proposing next step.",
      matchedSequenceStep: matched?.goal ?? "none",
    };
  }

  if (analysis.interestLevel === "high" && ctx.candidateTurns >= 3) {
    return {
      classification: analysis.classification,
      signal,
      status: "call_proposed",
      statusReason: "Strong interest — proposing next step toward goal",
      conversationStage: "closing",
      nextBeat: `Acknowledge their interest ("${signal}") and propose the concrete next step: ${ctx.intent.goal}`,
      decision: "Propose next step toward goal",
      rationale: `Interest high after ${ctx.candidateTurns} turns. Agent policy: move to ${ctx.intent.goal}.`,
      matchedSequenceStep: matched?.goal ?? "none",
    };
  }

  return {
    classification: analysis.classification,
    signal,
    status: "engaging",
    statusReason: "Continuing engagement toward goal",
    conversationStage: analysis.phase,
    nextBeat: `Respond to "${signal}" specifically, then advance one step toward: ${ctx.intent.goal}`,
    decision: "Continue conversation toward goal",
    rationale: `Agent phase: ${analysis.phase}. Interest: ${analysis.interestLevel}. Keeping thread alive with company-specific context.`,
    matchedSequenceStep: matched?.goal ?? "none",
  };
}

export function greetingRationale(
  candidate: MockCandidateProfile,
  company: CompanyContext,
  intent: AgentIntent,
  companyName?: string,
  companyIntelligence?: CompanyIntelligence | null,
): string {
  const intel = resolveIntelligence(company, companyIntelligence, companyName);
  const display = resolveCompanyDisplayName(company, companyName);
  const firstName = candidateFirstName(candidate);
  const policy = callPurposeGreetingPolicy(intent);
  return `Agent policy: ${intent.callPurpose} call with ${firstName} at ${display}. ${policy} Company: ${intel.whatTheyBuild}.`;
}

export function planContingencyGoals(intent: AgentIntent): { goal: string; purpose: string }[] {
  return planContingencyGoalsForPurpose(intent);
}
