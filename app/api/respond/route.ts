import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api/route-errors";
import { validateAgentPayload } from "@/lib/api/validate-agent-request";
import { Agent } from "@/lib/agent";
import type {
  AgentIntent,
  AgentPersona,
  CandidateModel,
  CompanyContext,
  ConversationMessage,
  MockCandidateProfile,
  SequenceStep,
  CompanyIntelligence,
} from "@/lib/types";
import { EMPTY_CANDIDATE_MODEL } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body: {
      company: CompanyContext;
      persona: AgentPersona;
      intent: AgentIntent;
      history: ConversationMessage[];
      candidateReply: string;
      candidateModel?: CandidateModel;
      sequence?: SequenceStep[];
      candidate?: MockCandidateProfile;
      companyName?: string;
      companyIntelligence?: CompanyIntelligence | null;
    } = await req.json();

    const error = validateAgentPayload({
      company: body.company,
      persona: body.persona,
      intent: body.intent,
      candidateReply: body.candidateReply,
    });
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const agent = new Agent(body.persona, body.company, body.companyName);
    return NextResponse.json(
      await agent.reactToReply(
        body.intent,
        body.history,
        body.candidateReply,
        body.candidateModel ?? EMPTY_CANDIDATE_MODEL,
        body.sequence ?? [],
        body.candidate,
        body.companyName,
        body.companyIntelligence,
      ),
    );
  } catch (err) {
    return jsonError(err);
  }
}
