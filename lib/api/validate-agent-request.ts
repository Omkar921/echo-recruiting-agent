import { isAgentReady } from "@/lib/session/keys";
import type { AgentIntent, AgentPersona, CompanyContext } from "@/lib/types";

export function validateAgentPayload(body: {
  company?: CompanyContext | null;
  persona?: AgentPersona | null;
  intent?: AgentIntent | null;
  candidateReply?: string;
}): string | null {
  if (!isAgentReady(body.company, body.persona)) {
    return "Missing or invalid company context and agent persona.";
  }
  if (!body.intent?.roleName?.trim() || !body.intent.goal?.trim()) {
    return "Missing role intent.";
  }
  if (body.candidateReply !== undefined && !body.candidateReply.trim()) {
    return "Candidate reply cannot be empty.";
  }
  return null;
}
