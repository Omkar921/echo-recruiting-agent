import { formatAgentDisplayName, normalizePersonaName } from "@/lib/agent/display-name";
import { callPurposeLabel } from "@/lib/agent/call-purpose";
import { companyIntelligenceBlock } from "@/lib/company/intelligence";
import {
  analyzeTurn,
  decideNextAction,
  greetingRationale,
  planContingencyGoals,
  type AgentDecision,
  type TurnAnalysis,
} from "@/lib/agent/engine";
import { callStructured } from "@/lib/ai/claude-client";
import { buildEngagementContextBlock } from "@/lib/agent/engagement-context";
import { candidateContextBlock, candidateFirstName } from "@/lib/candidates/mock-pool";
import {
  formatCandidateModel,
  personaSystemPrompt,
  sanitizeOutboundMessage,
  writeGreetingBrief,
  writeMessageBrief,
} from "@/lib/agent/prompts";
import type {
  AgentIntent,
  AgentPersona,
  CandidateModel,
  CompanyContext,
  CompanyIntelligence,
  ConversationMessage,
  MockCandidateProfile,
  SequenceStep,
} from "@/lib/types";
import { EMPTY_CANDIDATE_MODEL } from "@/lib/types";

export type { AgentDecision as Decision, TurnAnalysis };

export interface EngagementPlan {
  sequence: SequenceStep[];
  openingRationale: string;
}

export class Agent {
  public readonly persona: AgentPersona;

  constructor(
    persona: AgentPersona,
    private readonly company: CompanyContext,
    companyName?: string | null,
  ) {
    this.persona = normalizePersonaName(persona, companyName);
  }

  static async create(company: CompanyContext, companyName?: string): Promise<Agent> {
    const raw = await callStructured<Omit<AgentPersona, "name">>({
      system: [
        "You are a branding expert who designs the personality of human recruiters — not AI assistants. You read a company's description and infer a specific, distinctive voice for someone who will message candidates on that company's behalf and sound like an experienced person doing their job, not a chatbot.",
        "Avoid generic traits like 'friendly' or 'professional' alone — be specific to what THIS company actually sounds like.",
        "The speechPatterns you define must be concrete enough that someone could write exactly like this person.",
        "The voice must match the company's culture and tone — especially for APAC/warm/relationship-first cultures: human, respectful, not aggressive American sales copy.",
        "This agent's messages may be spoken aloud on live calls. Design a voice that sounds like a real recruiter talking at a natural, medium pace — not fast, not slow, never like someone reading a script.",
      ].join(" "),
      prompt: [
        `Design the voice and personality for ${formatAgentDisplayName(companyName)} — this company's dedicated Écho recruiting agent. Focus on traits, tone, and speech patterns only (the display name is fixed).`,
        ``,
        `Who they are: ${company.whoWeAre}`,
        `Culture: ${company.culture}`,
        `Profiles they hire: ${company.profilesWeHire}`,
        `Desired tone: ${company.tone}`,
        ``,
        `Give them 3-5 specific traits as "Short label — one-line description", a voice paragraph, one sample line, do-nots tied to this company, AND concrete speechPatterns:`,
        `- sentenceLength: how long their messages typically are`,
        `- usesContractions: true/false based on tone`,
        `- mirroringStyle: how they echo a candidate's own words back`,
        `- energyMatching: how they adapt when the candidate is brief vs detailed`,
        `- avoids: 3-5 writing habits they'd never use`,
        `- exampleGoodReply: one realistic message they'd actually send`,
        `- exampleBadReply: one message that sounds like generic AI recruiter copy they'd never send`,
        `- exampleGoodReply and sampleLine must sound natural when spoken aloud — conversational, medium pace, not a script`,
      ].join("\n"),
      toolName: "create_persona",
      toolDescription: "Define the agent's persona including concrete speech patterns.",
      schema: {
        type: "object",
        properties: {
          traits: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
          voiceDescription: { type: "string" },
          sampleLine: { type: "string" },
          doNots: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
          speechPatterns: {
            type: "object",
            properties: {
              sentenceLength: { type: "string" },
              usesContractions: { type: "boolean" },
              mirroringStyle: { type: "string" },
              energyMatching: { type: "string" },
              avoids: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
              exampleGoodReply: { type: "string" },
              exampleBadReply: { type: "string" },
            },
            required: [
              "sentenceLength",
              "usesContractions",
              "mirroringStyle",
              "energyMatching",
              "avoids",
              "exampleGoodReply",
              "exampleBadReply",
            ],
          },
        },
        required: [
          "traits",
          "voiceDescription",
          "sampleLine",
          "doNots",
          "speechPatterns",
        ],
      },
      maxTokens: 2000,
    });

    const persona: AgentPersona = {
      ...raw,
      name: formatAgentDisplayName(companyName),
    };

    return new Agent(persona, company, companyName);
  }

  private get system(): string {
    return personaSystemPrompt(this.persona, this.company);
  }

  private companyLayer(intelligence?: CompanyIntelligence | null): string {
    return intelligence ? companyIntelligenceBlock(intelligence) : "";
  }

  private formatTranscript(history: ConversationMessage[]): string {
    return history
      .map((m) => `${m.role === "agent" ? this.persona.name : "Candidate"}: ${m.content}`)
      .join("\n");
  }

  private turnCount(history: ConversationMessage[]): number {
    return history.filter((m) => m.role === "candidate").length;
  }

  /** Agent plans contingencies in code; API writes message text only (1 call). */
  async planEngagement(
    intent: AgentIntent,
    candidate?: MockCandidateProfile,
    companyName?: string,
    companyIntelligence?: CompanyIntelligence | null,
  ): Promise<EngagementPlan> {
    const intelBlock = this.companyLayer(companyIntelligence);
    const roleText = `${intent.roleName} ${intent.jobDescription} ${intent.requirements}`;
    const steps = planContingencyGoals(intent);
    const openingRationale = candidate
      ? greetingRationale(candidate, this.company, intent, companyName, companyIntelligence)
      : `Agent planned contingencies for ${intent.roleName} at ${companyName ?? "this company"}. Live greeting generated separately at call connect.`;

    const { messages } = await callStructured<{
      messages: { goal: string; content: string }[];
    }>({
      system: `${this.system}\n\n${intelBlock}`,
      prompt: [
        `Write contingency outreach messages — NOT the live call greeting.`,
        `Role: ${intent.roleName}. Goal: ${intent.goal}.`,
        candidate
          ? candidateContextBlock(candidate, this.company, companyName, companyIntelligence, roleText)
          : "",
        ``,
        `Agent has already planned these steps — write short human message text for each:`,
        ...steps.map((s, i) => `${i + 1}. [${s.goal}] ${s.purpose}`),
        ``,
        `One message per step. Short DMs. Company-specific, not generic.`,
      ].join("\n"),
      toolName: "write_contingencies",
      toolDescription: "Write contingency message text only — strategy is pre-decided.",
      schema: {
        type: "object",
        properties: {
          messages: {
            type: "array",
            items: {
              type: "object",
              properties: {
                goal: { type: "string" },
                content: { type: "string" },
              },
              required: ["goal", "content"],
            },
          },
        },
        required: ["messages"],
      },
      maxTokens: 2000,
    });

    const sequence = steps.map((step, i) => ({
      id: `step-${i}`,
      goal: step.goal,
      content: sanitizeOutboundMessage(
        messages[i]?.content ?? `[${step.goal}] ${step.purpose}`,
        this.company,
        candidate ? candidateFirstName(candidate) : undefined,
      ),
    }));

    return { sequence, openingRationale };
  }

  /** Agent decides greeting strategy; API writes words only (1 call). */
  async generateGreeting(
    intent: AgentIntent,
    candidate: MockCandidateProfile,
    companyName?: string,
    companyIntelligence?: CompanyIntelligence | null,
  ): Promise<{ greeting: string; rationale: string }> {
    const rationale = greetingRationale(
      candidate,
      this.company,
      intent,
      companyName,
      companyIntelligence,
    );
    const intelBlock = this.companyLayer(companyIntelligence);
    const firstName = candidateFirstName(candidate);

    const { greeting } = await callStructured<{ greeting: string }>({
      system: `${this.system}\n\n${intelBlock}`,
      prompt: [
        buildEngagementContextBlock(this.company, intent, candidate, {
          companyName,
          candidateTurns: 0,
          companyIntelligence,
        }),
        ``,
        writeGreetingBrief(
          this.persona,
          intent,
          this.company,
          candidate,
          companyName,
          companyIntelligence,
          rationale,
        ),
      ].join("\n"),
      toolName: "write_greeting",
      toolDescription: "Write greeting text only — agent already decided strategy.",
      schema: {
        type: "object",
        properties: { greeting: { type: "string" } },
        required: ["greeting"],
      },
      maxTokens: 600,
    });

    return {
      greeting: sanitizeOutboundMessage(greeting, this.company, firstName),
      rationale,
    };
  }

  /**
   * Agent-owned loop: interpret → decide → (API writes once).
   * Analysis and decision are deterministic agent logic, not LLM calls.
   */
  async reactToReply(
    intent: AgentIntent,
    history: ConversationMessage[],
    candidateReply: string,
    candidateModel: CandidateModel = EMPTY_CANDIDATE_MODEL,
    sequence: SequenceStep[] = [],
    candidate?: MockCandidateProfile,
    companyName?: string,
    companyIntelligence?: CompanyIntelligence | null,
  ): Promise<{ analysis: TurnAnalysis; decision: AgentDecision; reply: string }> {
    const transcript = this.formatTranscript(history);
    const turns = this.turnCount(history);
    const firstName = candidate ? candidateFirstName(candidate) : undefined;
    const intelBlock = this.companyLayer(companyIntelligence);

    const ctx = {
      intent,
      company: this.company,
      candidate,
      companyName,
      companyIntelligence,
      candidateTurns: turns,
      candidateReply,
      candidateModel,
      sequence,
    };

    const analysis = analyzeTurn(ctx);
    const decision = decideNextAction(analysis, ctx);

    const matchedStep = sequence.find(
      (s) =>
        decision.matchedSequenceStep &&
        decision.matchedSequenceStep !== "none" &&
        (s.goal.toLowerCase().includes(decision.matchedSequenceStep.toLowerCase()) ||
          decision.matchedSequenceStep.toLowerCase().includes(s.goal.toLowerCase())),
    );

    const intelligence = candidate
      ? buildEngagementContextBlock(this.company, intent, candidate, {
          companyName,
          candidateTurns: turns,
          companyIntelligence,
        })
      : "";

    const { reply } = await callStructured<{ reply: string }>({
      system: `${this.system}\n\n${intelBlock}`,
      prompt: [
        intelligence,
        `Conversation:\n${transcript}`,
        `Candidate (latest): ${candidateReply}`,
        ``,
        `Agent memory:\n${formatCandidateModel(analysis.candidateModel)}`,
        ``,
        writeMessageBrief({
          persona: this.persona,
          intent,
          candidateReply,
          nextBeat: decision.nextBeat,
          signal: decision.signal,
          phase: decision.conversationStage,
          candidate,
          companyName,
          contingencyHint: matchedStep?.content,
          callPurposeLabel: callPurposeLabel(intent.callPurpose, intent.callPurposeNotes),
        }),
      ].join("\n"),
      toolName: "write_reply",
      toolDescription: "Write reply text only — agent already analyzed and decided.",
      schema: {
        type: "object",
        properties: { reply: { type: "string" } },
        required: ["reply"],
      },
      maxTokens: 800,
    });

    return {
      analysis,
      decision,
      reply: sanitizeOutboundMessage(reply, this.company, firstName),
    };
  }
}
