import type { CallPurpose } from "@/lib/types";

export type ReportDimensionDef = {
  key: string;
  label: string;
  description: string;
};

const INTRO_DIMENSIONS: ReportDimensionDef[] = [
  {
    key: "english_proficiency",
    label: "English proficiency",
    description: "Fluency, grammar, and clarity of spoken English from their replies",
  },
  {
    key: "communication",
    label: "Communication clarity",
    description: "How clearly they express ideas and stay on topic",
  },
  {
    key: "confidence",
    label: "Confidence & presence",
    description: "Self-assurance, composure, and professional demeanor in responses",
  },
  {
    key: "engagement",
    label: "Engagement & expressions",
    description: "Warmth, attentiveness, and natural conversational energy",
  },
  {
    key: "answer_quality",
    label: "Answer quality",
    description: "Relevance, depth, and specificity of their answers",
  },
  {
    key: "role_fit",
    label: "Role fit signals",
    description: "Early indicators they match what the role and company need",
  },
];

const ASSESSMENT_DIMENSIONS: ReportDimensionDef[] = [
  {
    key: "experience_relevance",
    label: "Experience relevance",
    description: "How well past work maps to this role's requirements",
  },
  {
    key: "requirement_match",
    label: "Requirement match",
    description: "Coverage of must-have skills and background from the job brief",
  },
  {
    key: "motivation",
    label: "Motivation & interest",
    description: "Genuine interest in the company and role",
  },
  {
    key: "communication",
    label: "Communication",
    description: "Clarity and structure when explaining their background",
  },
  {
    key: "strengths",
    label: "Strengths demonstrated",
    description: "Standout capabilities shown during the call",
  },
  {
    key: "gaps",
    label: "Gaps & concerns",
    description: "Missing experience or red flags — score higher when fewer gaps",
  },
];

const TECHNICAL_DIMENSIONS: ReportDimensionDef[] = [
  {
    key: "technical_depth",
    label: "Technical knowledge",
    description: "Depth of understanding in core technical areas for the role",
  },
  {
    key: "domain_expertise",
    label: "Domain expertise",
    description: "Familiarity with the product domain, industry, or problem space",
  },
  {
    key: "tech_stack",
    label: "Tech stack proficiency",
    description: "Strength with relevant languages, tools, and frameworks",
  },
  {
    key: "problem_solving",
    label: "Problem-solving approach",
    description: "How they break down problems and explain tradeoffs",
  },
  {
    key: "work_experience",
    label: "Work experience",
    description: "Quality and relevance of projects and roles they described",
  },
  {
    key: "critical_thinking",
    label: "Critical understanding",
    description: "Ability to reason about systems, edge cases, and design choices",
  },
];

const OTHER_DIMENSIONS: ReportDimensionDef[] = [
  {
    key: "purpose_alignment",
    label: "Call purpose alignment",
    description: "How well the conversation met the stated custom call objective",
  },
  {
    key: "communication",
    label: "Communication",
    description: "Clarity and professionalism throughout the call",
  },
  {
    key: "role_fit",
    label: "Role fit",
    description: "Signals they match the engagement goal",
  },
  {
    key: "highlights",
    label: "Standout moments",
    description: "Best things they said or demonstrated",
  },
];

export function reportDimensionsForPurpose(purpose: CallPurpose): ReportDimensionDef[] {
  switch (purpose) {
    case "intro":
      return INTRO_DIMENSIONS;
    case "assessment":
      return ASSESSMENT_DIMENSIONS;
    case "technical":
      return TECHNICAL_DIMENSIONS;
    case "other":
      return OTHER_DIMENSIONS;
  }
}

export function includesNextRoundLikelihood(purpose: CallPurpose): boolean {
  return purpose === "intro" || purpose === "assessment" || purpose === "other";
}
