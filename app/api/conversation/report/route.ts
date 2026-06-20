import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api/route-errors";
import { validateAgentPayload } from "@/lib/api/validate-agent-request";
import { generateCallReport } from "@/lib/agent/report";
import type {
  AgentIntent,
  AgentPersona,
  CandidateModel,
  CompanyContext,
  ConversationMessage,
  MockCandidateProfile,
} from "@/lib/types";
import { EMPTY_CANDIDATE_MODEL } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body: {
      company: CompanyContext;
      persona: AgentPersona;
      intent: AgentIntent;
      messages: ConversationMessage[];
      candidateModel?: CandidateModel;
      candidate: MockCandidateProfile;
      companyName?: string;
    } = await req.json();

    const error = validateAgentPayload({
      company: body.company,
      persona: body.persona,
      intent: body.intent,
    });
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    if (!body.messages?.length) {
      return NextResponse.json({ error: "No conversation to report on." }, { status: 400 });
    }
    if (!body.candidate) {
      return NextResponse.json({ error: "Missing candidate." }, { status: 400 });
    }

    const report = await generateCallReport({
      company: body.company,
      persona: body.persona,
      intent: body.intent,
      messages: body.messages,
      candidateModel: body.candidateModel ?? EMPTY_CANDIDATE_MODEL,
      candidate: body.candidate,
      companyName: body.companyName,
    });

    return NextResponse.json({ report });
  } catch (err) {
    return jsonError(err);
  }
}
