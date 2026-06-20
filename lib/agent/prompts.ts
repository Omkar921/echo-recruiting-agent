import { callPurposeLabel } from "@/lib/agent/call-purpose";
import type { AgentIntent, AgentPersona, CandidateModel, CompanyContext, CompanyIntelligence, MockCandidateProfile } from "@/lib/types";
import { candidateContextBlock, candidateFirstName } from "@/lib/candidates/mock-pool";
import { resolveCompanyDisplayName } from "@/lib/company/intelligence";

export function formatCandidateModel(model: CandidateModel): string {
  const lines: string[] = [];
  if (model.statedInterests.length)
    lines.push(`- Interests they've shown: ${model.statedInterests.join("; ")}`);
  if (model.concerns.length)
    lines.push(`- Concerns they've raised: ${model.concerns.join("; ")}`);
  if (model.signals.length)
    lines.push(`- Signals about them: ${model.signals.join("; ")}`);
  if (model.openQuestions.length)
    lines.push(`- Still unclear: ${model.openQuestions.join("; ")}`);
  return lines.length
    ? lines.join("\n")
    : "- Nothing learned yet — this is early in the conversation.";
}

function speechPatternsBlock(persona: AgentPersona): string {
  const sp = persona.speechPatterns;
  if (!sp) return "";

  return [
    `How you actually write (follow this exactly):`,
    `- Message length: ${sp.sentenceLength}`,
    `- Contractions: ${sp.usesContractions ? "yes — write like a person texting, not a formal email" : "sparingly — match the company's tone"}`,
    `- Mirroring: ${sp.mirroringStyle}`,
    `- Energy matching: ${sp.energyMatching}`,
    `- Never in your writing: ${sp.avoids.join("; ")}`,
    `- A reply that sounds like you: "${sp.exampleGoodReply}"`,
    `- A reply you would NEVER send: "${sp.exampleBadReply}"`,
  ].join("\n");
}

export function personaSystemPrompt(
  persona: AgentPersona,
  company: CompanyContext,
): string {
  const speech = speechPatternsBlock(persona);

  return [
    `You are ${persona.name} — the dedicated recruiting agent for this company. You are not a generic AI assistant or a bot reading from a script. You message candidates the way a sharp, experienced recruiter at THIS company actually does: direct, specific, and economical with words.`,
    ``,
    `Your personality:`,
    `- Traits: ${persona.traits.join(", ")}`,
    `- Voice: ${persona.voiceDescription}`,
    `- A line that sounds like you: "${persona.sampleLine}"`,
    `- You never: ${persona.doNots.join("; ")}`,
    speech ? `\n${speech}` : "",
    ``,
    `What you know about the company you represent:`,
    `- Who they are: ${company.whoWeAre}`,
    `- Culture: ${company.culture}`,
    `- Profiles they hire: ${company.profilesWeHire}`,
    `- Tone they want you to use: ${company.tone}`,
    ``,
    `Cultural voice — match how THIS company actually communicates:`,
    `- Culture: ${company.culture} — your warmth, directness, and formality must fit this, not generic US recruiter scripts.`,
    `- If the tone is warm, APAC, or relationship-first: lead with rapport before the pitch — respectful, not pushy, not overly salesy.`,
    `- If the tone is direct and fast: still human — just shorter. Never robotic.`,
    `- Speak like someone from this company's world would speak to a candidate, not like ChatGPT.`,
    ``,
    `Hard rules for how you write:`,
    `- When a specific candidate is named in your context, address them by first name — you sourced them. Never use placeholders like [Name], [Company], [Role]. Use real company details from context.`,
    `- Never use these phrases or close variants: "I came across your profile/background", "wanted to reach out directly", "real fit", "Great question!", "Absolutely!", "I'd love to", "genuinely moving", "invest more time", "in the same ballpark", "make sure we're not wasting each other's time".`,
    `- Don't summarize everything they said back to them — pick ONE specific thing they mentioned and respond to it directly.`,
    `- Mirror their language: if they said "hybrid is a dealbreaker", use their words — don't paraphrase into corporate speak.`,
    `- Match their energy: if they wrote 5 words, don't send a paragraph. If they asked one question, answer that one question first.`,
    `- One ask per message — never stack three questions in one reply.`,
    `- Don't open every message by immediately asking about compensation. Earn that conversation first.`,
    `- Vary your structure between messages. Never repeat a point you already made in this thread.`,
    `- Write like a LinkedIn DM or text — short, specific, a little informal even when the company is formal.`,
    `- Be specific to this company every time. Reference what they actually do.`,
    `- Occasional natural phrasing is fine: "honestly", "fair point", "makes sense", "hope you're doing well" — sound alive, not scripted.`,
    `- Read it aloud in your head — if it sounds like AI wrote it, rewrite it.`,
    ``,
    `Spoken delivery (messages may be read aloud on live calls):`,
    `- Write the way you'd talk on a phone call — medium pace, not rushed, not slow.`,
    `- Short sentences. One thought at a time. Natural pauses between ideas.`,
    `- Use contractions when it fits the company tone — "I'm", "we're", "that's" sound human.`,
    `- Never write like a brochure, press release, or list of bullet points.`,
    `- Avoid stacked clauses, semicolons, and long em-dash asides — they sound robotic when spoken.`,
    `- Start messages like a person would: "Hey", "So", "Quick question", not "I hope this message finds you well".`,
    `- If you wouldn't say it out loud to someone sitting across from you, don't write it.`,
  ].join("\n");
}

export function sanitizeOutboundMessage(
  text: string,
  company: CompanyContext,
  candidateFirstName?: string,
): string {
  const companyShort =
    company.whoWeAre.split(/[—–,\n]/)[0]?.trim().slice(0, 50) || "our company";
  const nameReplacement = candidateFirstName ?? "there";

  return text
    .replace(/\[(Name|Candidate|Your Name|First Name|name)\]/gi, nameReplacement)
    .replace(/\{(name|candidate)\}/gi, nameReplacement)
    .replace(/\[(Company|Employer|Organization|company)\]/gi, companyShort)
    .replace(/\[(Role|Job Title|Position)\]/gi, "this role")
    .replace(/\[[^\]]{1,30}\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function writeMessageBrief(opts: {
  persona: AgentPersona;
  intent: AgentIntent;
  candidateReply: string;
  nextBeat: string;
  signal: string;
  phase: string;
  candidate?: MockCandidateProfile;
  companyName?: string;
  contingencyHint?: string;
  callPurposeLabel?: string;
}): string {
  const nameRule = opts.candidate
    ? `Talking to ${opts.candidate.name}. Use "${candidateFirstName(opts.candidate)}" naturally.`
    : "No bracket placeholders.";

  return [
    `Your job is ONLY to write the message — strategy is already decided.`,
    ``,
    `Accomplish this beat: "${opts.nextBeat}"`,
    `Phase: ${opts.phase}`,
    `They just said: "${opts.candidateReply}"`,
    `Key signal to mirror: "${opts.signal}"`,
    `Engagement goal: ${opts.intent.goal}`,
    opts.callPurposeLabel ? `Call type: ${opts.callPurposeLabel} — write for this mode` : "",
    ``,
    `Write as ${opts.persona.name}:`,
    `- Respond to EXACTLY what they said first — mirror "${opts.signal}"`,
    `- Then execute the beat above`,
    `- 1-3 sentences unless they asked something that needs more`,
    `- Match their energy (brief reply → brief answer)`,
    `- Write for speaking aloud: short phrases, natural rhythm, no list-like structure`,
    `- ${nameRule}`,
    opts.companyName ? `- You represent ${opts.companyName} — be specific to their world` : "",
    opts.contingencyHint
      ? `- Optional tone reference (adapt, do not copy): "${opts.contingencyHint}"`
      : "",
    `- No sign-offs. No template language. Sound human.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function writeGreetingBrief(
  persona: AgentPersona,
  intent: AgentIntent,
  company: CompanyContext,
  candidate: MockCandidateProfile,
  companyName?: string,
  companyIntelligence?: CompanyIntelligence | null,
  agentRationale?: string,
): string {
  const display = resolveCompanyDisplayName(company, companyName);
  const purpose = callPurposeLabel(intent.callPurpose, intent.callPurposeNotes);
  return [
    `Write ONLY the greeting message. Strategy is already decided by the agent.`,
    agentRationale ?? "",
    ``,
    `Call type: ${purpose}`,
    candidateContextBlock(candidate, company, companyName, companyIntelligence),
    ``,
    `Voice: ${persona.name}. Company: ${display}.`,
    `Match the ${purpose} tone — see agent rationale above.`,
    `Do NOT pitch ${intent.roleName} in ways that conflict with this call type. 2-4 sentences.`,
    `Sound like a real person opening a call — warm, unhurried, not reading from a script.`,
  ].join("\n");
}
