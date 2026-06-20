import type { AgentIntent, CallPurpose } from "@/lib/types";

export const CALL_PURPOSE_OPTIONS: {
  value: CallPurpose;
  label: string;
  description: string;
}[] = [
  {
    value: "intro",
    label: "Introduction call",
    description: "First conversation — rapport, company intro, light fit exploration",
  },
  {
    value: "assessment",
    label: "Assessment call",
    description: "Evaluate experience and fit against role requirements",
  },
  {
    value: "technical",
    label: "Technical round",
    description: "Deep dive on skills, systems, and how they solve problems",
  },
  {
    value: "other",
    label: "Other",
    description: "Custom call purpose — describe below",
  },
];

export function callPurposeLabel(purpose: CallPurpose, notes?: string): string {
  const match = CALL_PURPOSE_OPTIONS.find((o) => o.value === purpose);
  if (purpose === "other" && notes?.trim()) return notes.trim();
  return match?.label ?? "Call";
}

export function callPurposeAgentBlock(intent: AgentIntent): string {
  const label = callPurposeLabel(intent.callPurpose, intent.callPurposeNotes);
  const base = CALL_PURPOSE_OPTIONS.find((o) => o.value === intent.callPurpose);

  const guides: Record<CallPurpose, string> = {
    intro: [
      `CALL PURPOSE: ${label} — introduction / screening.`,
      `Agent mode: warm, curious, unhurried. Learn who they are before evaluating.`,
      `Prioritize rapport → company/role context → mutual interest. Do not interrogate.`,
    ].join("\n"),
    assessment: [
      `CALL PURPOSE: ${label} — structured fit evaluation.`,
      `Agent mode: thoughtful interviewer. Map their experience to role requirements.`,
      `Ask targeted questions about past work, outcomes, and gaps. Still human — not a checklist robot.`,
    ].join("\n"),
    technical: [
      `CALL PURPOSE: ${label} — technical depth.`,
      `Agent mode: technical peer / hiring manager tone. Probe systems, tradeoffs, and problem-solving.`,
      `Reference stack and requirements from the role. Go deeper when they show strength; clarify when vague.`,
    ].join("\n"),
    other: [
      `CALL PURPOSE: ${label}.`,
      intent.callPurposeNotes?.trim()
        ? `Custom brief from hiring team: ${intent.callPurposeNotes.trim()}`
        : `Agent mode: follow the engagement goal while staying company-specific.`,
    ].join("\n"),
  };

  return [guides[intent.callPurpose], base?.description ? `(${base.description})` : ""]
    .filter(Boolean)
    .join(" ");
}

export function callPurposePhaseGuide(
  purpose: CallPurpose,
  candidateTurns: number,
  notes?: string,
): string {
  if (purpose === "intro") {
    if (candidateTurns === 0)
      return "PHASE: Intro call opening — rapport only. Greet, ask how they are, set expectation that this is an introduction to the company.";
    if (candidateTurns === 1)
      return "PHASE: Intro — respond to their greeting warmly. Light follow-up; learn one thing about them before role context.";
    if (candidateTurns === 2)
      return "PHASE: Intro — bridge into company, role, and why they might be a fit. Keep it conversational.";
    if (candidateTurns === 3)
      return "PHASE: Intro — final exchange. One short question max, then begin closing. Total call: 3-4 exchanges.";
    return "PHASE: Intro — close warmly. Thank them, recap one positive signal, no new questions.";
  }

  if (purpose === "assessment") {
    if (candidateTurns === 0)
      return "PHASE: Assessment opening — brief rapport, then frame this as a fit conversation for the role.";
    if (candidateTurns === 1)
      return "PHASE: Assessment — acknowledge them, then one question about relevant experience for this role.";
    if (candidateTurns === 2)
      return "PHASE: Assessment — probe a specific project or outcome from their background vs requirements.";
    if (candidateTurns === 3)
      return "PHASE: Assessment — final qualifying question or start closing. Keep to 3-4 exchanges total.";
    return "PHASE: Assessment — close: summarize fit signals and thank them.";
  }

  if (purpose === "technical") {
    if (candidateTurns === 0)
      return "PHASE: Technical opening — short rapport, then frame this as a technical conversation for the role.";
    if (candidateTurns === 1)
      return "PHASE: Technical — brief human ack, then one technical question tied to role requirements or their stack.";
    if (candidateTurns === 2)
      return "PHASE: Technical — go deeper on architecture, tradeoffs, or a system they built.";
    if (candidateTurns === 3)
      return "PHASE: Technical — one final technical probe OR start closing. Max 3-4 exchanges.";
    return "PHASE: Technical — close: acknowledge strongest technical signal and thank them.";
  }

  // other
  const custom = notes?.trim() ? ` Custom focus: ${notes.trim()}.` : "";
  if (candidateTurns === 0)
    return `PHASE: Custom call opening — rapport, then align to the stated call purpose.${custom}`;
  if (candidateTurns <= 2)
    return `PHASE: Custom call — stay on the hiring team's purpose.${custom}`;
  if (candidateTurns === 3)
    return `PHASE: Custom call — final exchange, begin closing.${custom}`;
  return `PHASE: Custom call — close and thank the candidate.${custom}`;
}

export function callPurposeGreetingPolicy(intent: AgentIntent): string {
  const label = callPurposeLabel(intent.callPurpose, intent.callPurposeNotes);
  switch (intent.callPurpose) {
    case "intro":
      return `Intro call — greet, ask how their day is, mention this is an introduction to ${label} for the ${intent.roleName} opportunity. No heavy assessment yet.`;
    case "assessment":
      return `Assessment call — greet warmly, set expectation that you'll explore fit for ${intent.roleName} against what the team needs.`;
    case "technical":
      return `Technical round — greet briefly, set expectation that this conversation will focus on technical depth for ${intent.roleName}.`;
    case "other":
      return intent.callPurposeNotes?.trim()
        ? `Custom call (${intent.callPurposeNotes.trim()}) — greet and briefly frame why you're on the line for ${intent.roleName}.`
        : `Greet and frame the call for ${intent.roleName} per the engagement goal.`;
  }
}

export function callPurposeBridgeBeat(
  purpose: CallPurpose,
  roleName: string,
  hook: string,
  display: string,
): string {
  switch (purpose) {
    case "technical":
      return `Respond to them, then ask one technical question linking ${hook} to ${roleName} at ${display}`;
    case "assessment":
      return `Respond to them, then assess one requirement against ${hook} for ${roleName} at ${display}`;
    case "intro":
      return `Respond to them, then tie ${hook} to ${display} and the ${roleName} role in one natural bridge`;
    case "other":
      return `Respond to them, then connect ${hook} to ${roleName} at ${display} per the call purpose`;
  }
}

export function planContingencyGoalsForPurpose(intent: AgentIntent): { goal: string; purpose: string }[] {
  const common = [
    {
      goal: "Follow-up if silent",
      purpose: "Short nudge if the candidate goes quiet",
    },
    {
      goal: "Handle objection",
      purpose: "Address concerns honestly then re-engage",
    },
    {
      goal: "Close or nurture",
      purpose: "Respectful close if not a fit, or nurture if timing is wrong",
    },
  ];

  const purposeSpecific: Record<CallPurpose, { goal: string; purpose: string }[]> = {
    intro: [
      { goal: "Handle interest", purpose: `Move toward: ${intent.goal}` },
      { goal: "Answer question", purpose: "Answer company or role questions warmly" },
    ],
    assessment: [
      { goal: "Probe experience", purpose: "Ask about a relevant project vs requirements" },
      { goal: "Summarize fit", purpose: "Reflect back strengths and open questions" },
    ],
    technical: [
      { goal: "Technical probe", purpose: "Ask a follow-up on systems, stack, or tradeoffs" },
      { goal: "Clarify depth", purpose: "Dig deeper when an answer is vague" },
    ],
    other: [
      { goal: "Advance call purpose", purpose: intent.callPurposeNotes?.trim() || intent.goal },
      { goal: "Answer question", purpose: "Respond on-topic to the custom call" },
    ],
  };

  return [...purposeSpecific[intent.callPurpose], ...common];
}
