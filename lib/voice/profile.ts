import type { AgentPersona, CompanyContext } from "@/lib/types";

export interface VoiceDeliveryProfile {
  rate: number;
  pitch: number;
  volume: number;
  /** Shown in UI — e.g. "Warm & conversational" */
  label: string;
  /** Substrings to prefer when matching system voices */
  voiceHints: string[];
}

/** Natural conversational pace — not rushed, not sluggish. */
const HUMAN_PACE = 0.98;

type VoiceArchetype =
  | "energetic_professional"
  | "strict_professional"
  | "warm_energetic"
  | "warm_casual"
  | "direct_fast"
  | "calm_measured";

const ARCHETYPES: Record<
  VoiceArchetype,
  Omit<VoiceDeliveryProfile, "label"> & { label: string }
> = {
  energetic_professional: {
    label: "Warm & professional",
    rate: HUMAN_PACE,
    pitch: 1.01,
    volume: 1,
    voiceHints: ["Samantha", "Natural", "Premium", "Neural", "Karen", "Google US English"],
  },
  strict_professional: {
    label: "Clear & steady",
    rate: 0.96,
    pitch: 0.99,
    volume: 0.96,
    voiceHints: ["Daniel", "Natural", "Premium", "Microsoft David", "Alex"],
  },
  warm_energetic: {
    label: "Upbeat & natural",
    rate: 1,
    pitch: 1.02,
    volume: 1,
    voiceHints: ["Samantha", "Natural", "Karen", "Moira", "Premium", "Neural"],
  },
  warm_casual: {
    label: "Conversational",
    rate: HUMAN_PACE,
    pitch: 1.01,
    volume: 1,
    voiceHints: ["Samantha", "Natural", "Karen", "Victoria", "Premium", "Neural"],
  },
  direct_fast: {
    label: "Direct & natural",
    rate: 1,
    pitch: 1,
    volume: 1,
    voiceHints: ["Natural", "Samantha", "Premium", "Neural", "Google US English"],
  },
  calm_measured: {
    label: "Calm & natural",
    rate: 0.95,
    pitch: 0.99,
    volume: 0.94,
    voiceHints: ["Daniel", "Natural", "Serena", "Premium", "Microsoft David"],
  },
};

function corpus(company: CompanyContext, persona?: AgentPersona): string {
  return [
    company.tone,
    company.culture,
    company.profilesWeHire,
    persona?.voiceDescription ?? "",
    persona?.traits.join(" ") ?? "",
    persona?.speechPatterns?.sentenceLength ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export function inferVoiceArchetype(company: CompanyContext, persona?: AgentPersona): VoiceArchetype {
  const text = corpus(company, persona);

  const energetic =
    /\b(energetic|upbeat|enthusiastic|dynamic|high-energy|happy|excited|passionate|vibrant)\b/.test(text);
  const strict =
    /\b(strict|formal|corporate|precise|rigid|serious|no-nonsense|professional only|executive|compliance)\b/.test(
      text,
    );
  const warm =
    /\b(warm|friendly|approachable|human|relationship|empathetic|caring|supportive|apac|respectful)\b/.test(
      text,
    );
  const casual = /\b(casual|informal|relaxed|conversational|text-like|laid-back|startup)\b/.test(text);
  const direct = /\b(direct|fast|concise|brief|sharp|straightforward|blunt|efficient)\b/.test(text);
  const calm = /\b(measured|thoughtful|deliberate|slow|patient|calm|steady|understated)\b/.test(text);

  if (strict && !energetic && !casual) return "strict_professional";
  if (energetic && strict) return "energetic_professional";
  if (energetic && warm) return "warm_energetic";
  if (energetic && !strict) return "warm_energetic";
  if (direct && !warm) return "direct_fast";
  if (calm || (warm && !energetic && !casual)) return "calm_measured";
  if (warm || casual) return "warm_casual";
  if (strict) return "strict_professional";
  return "warm_casual";
}

export function resolveVoiceProfile(
  company: CompanyContext,
  persona?: AgentPersona,
): VoiceDeliveryProfile {
  const archetype = inferVoiceArchetype(company, persona);
  const base = ARCHETYPES[archetype];

  let rate = base.rate;
  let pitch = base.pitch;

  if (persona?.speechPatterns?.usesContractions === false) {
    rate = Math.max(rate - 0.02, 0.94);
    pitch = Math.min(pitch, 1);
  }

  rate = Math.min(Math.max(rate, 0.93), 1.02);

  return {
    label: base.label,
    rate,
    pitch,
    volume: base.volume,
    voiceHints: base.voiceHints,
  };
}

export function pickVoiceForProfile(
  voices: SpeechSynthesisVoice[],
  profile: VoiceDeliveryProfile,
): SpeechSynthesisVoice | null {
  const en = voices.filter((v) => v.lang.startsWith("en"));
  if (!en.length) return voices[0] ?? null;

  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;

  for (const voice of en) {
    let score = 0;
    const name = voice.name.toLowerCase();
    for (let i = 0; i < profile.voiceHints.length; i++) {
      if (name.includes(profile.voiceHints[i]!.toLowerCase())) {
        score += 10 - i;
      }
    }
    if (name.includes("natural") || name.includes("premium") || name.includes("neural")) score += 4;
    if (name.includes("enhanced")) score += 3;
    if (name.includes("compact") || name.includes("novelty") || name.includes("bells")) score -= 6;
    if (voice.default) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = voice;
    }
  }

  return best ?? en[0] ?? null;
}
