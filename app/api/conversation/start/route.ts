import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api/route-errors";
import { validateAgentPayload } from "@/lib/api/validate-agent-request";
import { Agent } from "@/lib/agent";
import type { AgentIntent, AgentPersona, CompanyContext, CompanyIntelligence, MockCandidateProfile } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body: {
      company: CompanyContext;
      persona: AgentPersona;
      intent: AgentIntent;
      candidate: MockCandidateProfile;
      companyName?: string;
      companyIntelligence?: CompanyIntelligence | null;
    } = await req.json();

    if (!body.candidate) {
      return NextResponse.json({ error: "Candidate is required." }, { status: 400 });
    }

    const error = validateAgentPayload({
      company: body.company,
      persona: body.persona,
      intent: body.intent,
    });
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const agent = new Agent(body.persona, body.company, body.companyName);
    return NextResponse.json(
      await agent.generateGreeting(
        body.intent,
        body.candidate,
        body.companyName,
        body.companyIntelligence,
      ),
    );
  } catch (err) {
    return jsonError(err);
  }
}
