import type {
  CandidateRoleFamily,
  CompanyContext,
  CompanyIntelligence,
  MockCandidateProfile,
} from "@/lib/types";
import {
  describeCompanyCandidateFit,
  resolveIntelligence,
  scoreCandidateForCompany,
  tailorCandidateHighlight,
} from "@/lib/company/intelligence";

const POOL: MockCandidateProfile[] = [
  // ── Full Stack ──────────────────────────────────────────────────────────
  {
    id: "fs1",
    name: "Priya Sharma",
    headline: "Full Stack Engineer · React & Node",
    location: "Singapore",
    experience: "6 yrs · fintech & SaaS",
    highlight: "Shipped merchant dashboard at Grab — React, Node, and API design at scale",
    matchScore: 94,
    matchLabel: "strong",
    roleFamily: "fullstack",
    tags: ["React", "Full Stack", "TypeScript", "Node", "Dashboard", "fintech", "scale"],
  },
  {
    id: "fs2",
    name: "Elena Rossi",
    headline: "Full Stack Developer · Next.js & PostgreSQL",
    location: "Milan",
    experience: "5 yrs · e-commerce & marketplaces",
    highlight: "Built seller tooling at a Shopify Plus agency — strong on merchant-facing flows",
    matchScore: 91,
    matchLabel: "strong",
    roleFamily: "fullstack",
    tags: ["Next.js", "Full Stack", "PostgreSQL", "e-commerce", "React", "merchant"],
  },
  {
    id: "fs3",
    name: "Ryan O'Brien",
    headline: "Software Engineer · Generalist",
    location: "Austin",
    experience: "4 yrs · early-stage startups",
    highlight: "First engineer at two seed startups — wears many hats, less big-company process",
    matchScore: 68,
    matchLabel: "partial",
    roleFamily: "fullstack",
    tags: ["Full Stack", "startup", "0-to-1", "generalist", "React", "Python"],
  },
  {
    id: "fs4",
    name: "Daniel Kim",
    headline: "Senior Full Stack Developer · React & Java",
    location: "Seattle",
    experience: "8 yrs · enterprise SaaS",
    highlight: "Led billing and subscription services at a B2B platform — React front-end, Spring Boot APIs",
    matchScore: 92,
    matchLabel: "strong",
    roleFamily: "fullstack",
    priorEmployers: "Microsoft (contract)",
    tags: ["Full Stack", "React", "Java", "Spring", "SaaS", "API", "enterprise", "scale"],
  },
  {
    id: "fs5",
    name: "Maria Santos",
    headline: "Full Stack Engineer · Python & React",
    location: "São Paulo",
    experience: "5 yrs · healthtech",
    highlight: "Built patient portal and clinician dashboard — Django REST, React, HIPAA-aware workflows",
    matchScore: 88,
    matchLabel: "strong",
    roleFamily: "fullstack",
    tags: ["Full Stack", "Python", "Django", "React", "healthtech", "API", "PostgreSQL"],
  },
  {
    id: "fs6",
    name: "Tom Hughes",
    headline: "Staff Full Stack Engineer · Cloud Native",
    location: "San Francisco",
    experience: "10 yrs · high-traffic consumer apps",
    highlight: "Architected microservices on AWS for 2M+ DAU product — React, Node, Kubernetes, observability",
    matchScore: 95,
    matchLabel: "strong",
    roleFamily: "fullstack",
    tags: ["Full Stack", "AWS", "React", "Node", "Kubernetes", "microservices", "scale", "distributed"],
  },
  {
    id: "fs7",
    name: "Yuki Tanabe",
    headline: "Full Stack Developer · TypeScript end-to-end",
    location: "Tokyo",
    experience: "4 yrs · gaming & media",
    highlight: "Strong TypeScript across Next.js and tRPC — less experience with legacy Java backends",
    matchScore: 74,
    matchLabel: "partial",
    roleFamily: "fullstack",
    tags: ["Full Stack", "TypeScript", "Next.js", "tRPC", "React", "Node", "consumer"],
  },
  {
    id: "fs8",
    name: "Chris Alvarez",
    headline: "Full Stack Engineer · Ruby on Rails",
    location: "Chicago",
    experience: "6 yrs · marketplaces",
    highlight: "Deep Rails + Hotwire experience — can pick up React stacks but Rails is home base",
    matchScore: 62,
    matchLabel: "stretch",
    roleFamily: "fullstack",
    tags: ["Full Stack", "Ruby", "Rails", "PostgreSQL", "marketplace", "API"],
  },
  {
    id: "fs9",
    name: "James Park",
    headline: "Full Stack Engineer · Search & Internal Tools",
    location: "Mountain View, CA",
    experience: "5 yrs · Google Search infrastructure",
    highlight: "Built experiment dashboards and tooling for Search ranking teams — React, Java, massive-scale internal platforms",
    matchScore: 96,
    matchLabel: "strong",
    roleFamily: "fullstack",
    priorEmployers: "Google",
    tags: ["Full Stack", "React", "Java", "Google", "search", "platform", "scale", "distributed"],
  },
  {
    id: "fs10",
    name: "Lisa Nguyen",
    headline: "Senior Full Stack Developer · Platform",
    location: "New York",
    experience: "7 yrs · YouTube & fintech",
    highlight: "Four years at Google on YouTube creator tooling before payments startup — knows large-scale consumer product eng",
    matchScore: 94,
    matchLabel: "strong",
    roleFamily: "fullstack",
    priorEmployers: "Google, YouTube",
    tags: ["Full Stack", "React", "TypeScript", "Google", "YouTube", "platform", "consumer", "scale"],
  },
  {
    id: "fs11",
    name: "Arjun Mehta",
    headline: "Full Stack Engineer · Cloud & Ads",
    location: "Bangalore",
    experience: "6 yrs · Google Cloud partner ecosystem",
    highlight: "Shipped partner portal and billing UI for GCP marketplace integrations — React, Go, high-reliability APIs",
    matchScore: 90,
    matchLabel: "strong",
    roleFamily: "fullstack",
    priorEmployers: "Google Cloud",
    tags: ["Full Stack", "React", "Go", "Google", "cloud", "API", "platform"],
  },
  {
    id: "fe1",
    name: "James Okonkwo",
    headline: "Frontend Developer · Vue",
    location: "London",
    experience: "5 yrs · e-commerce",
    highlight: "Solid UI engineer but primary stack is Vue, not React — would need ramp-up",
    matchScore: 58,
    matchLabel: "stretch",
    roleFamily: "frontend",
    tags: ["Vue", "Frontend", "E-commerce", "CSS", "JavaScript"],
  },

  // ── UI / UX ───────────────────────────────────────────────────────────────
  {
    id: "ux1",
    name: "Jordan Blake",
    headline: "Senior Product Designer · UI/UX",
    location: "Berlin",
    experience: "6 yrs · design systems & fintech",
    highlight: "Built dashboard design systems for fintech — strong Figma, prototyping, user research",
    matchScore: 93,
    matchLabel: "strong",
    roleFamily: "uiux",
    tags: ["UI", "UX", "Design", "Figma", "design systems", "prototyping", "fintech"],
  },
  {
    id: "ux2",
    name: "Aisha Patel",
    headline: "UX Designer · Research-led",
    location: "Toronto",
    experience: "5 yrs · B2B SaaS & healthcare",
    highlight: "Led discovery and usability testing for complex enterprise workflows",
    matchScore: 89,
    matchLabel: "strong",
    roleFamily: "uiux",
    tags: ["UX", "user research", "usability", "B2B", "enterprise", "Figma"],
  },
  {
    id: "ux3",
    name: "Noah Reyes",
    headline: "UI Designer · Visual & Systems",
    location: "Barcelona",
    experience: "4 yrs · consumer apps",
    highlight: "Visual polish and component libraries — lighter on research, heavier on UI craft",
    matchScore: 72,
    matchLabel: "partial",
    roleFamily: "uiux",
    tags: ["UI", "visual design", "design systems", "consumer", "mobile"],
  },

  // ── AI / ML Engineer ──────────────────────────────────────────────────────
  {
    id: "ai1",
    name: "Dr. Wei Zhang",
    headline: "AI Engineer · LLMs & RAG",
    location: "Seattle",
    experience: "7 yrs · applied ML & NLP",
    highlight: "Production RAG pipelines and fine-tuned models — previously at a cloud AI team",
    matchScore: 96,
    matchLabel: "strong",
    roleFamily: "ai_engineer",
    tags: ["LLM", "AI", "ML", "RAG", "Python", "PyTorch", "NLP", "AWS"],
  },
  {
    id: "ai2",
    name: "Sofia Andersen",
    headline: "ML Engineer · MLOps",
    location: "Copenhagen",
    experience: "5 yrs · model deployment & monitoring",
    highlight: "Shipped inference at scale — strong on pipelines, less on research novelty",
    matchScore: 88,
    matchLabel: "strong",
    roleFamily: "ai_engineer",
    tags: ["MLOps", "AI", "ML", "Python", "Kubernetes", "scale", "inference"],
  },
  {
    id: "ai3",
    name: "Kevin Baptiste",
    headline: "Data Scientist → AI Engineer",
    location: "Montreal",
    experience: "4 yrs · analytics pivoting to eng",
    highlight: "Strong notebooks and experimentation — still building production ML muscle",
    matchScore: 65,
    matchLabel: "partial",
    roleFamily: "ai_engineer",
    tags: ["data science", "ML", "Python", "experimentation", "analytics"],
  },

  // ── Product Engineer ──────────────────────────────────────────────────────
  {
    id: "pe1",
    name: "Luis Morales",
    headline: "Product Engineer · Full Stack",
    location: "Mexico City",
    experience: "6 yrs · customer-facing features",
    highlight: "Ex-PM who codes — ships end-to-end features with strong product sense and user empathy",
    matchScore: 95,
    matchLabel: "strong",
    roleFamily: "product_engineer",
    tags: ["Product Engineer", "Full Stack", "React", "product sense", "0-to-1", "customer-facing"],
  },
  {
    id: "pe2",
    name: "Hannah Cho",
    headline: "Product Engineer · Growth & UX",
    location: "San Francisco",
    experience: "5 yrs · B2C & onboarding",
    highlight: "Owns activation funnels — codes, designs experiments, talks to users weekly",
    matchScore: 92,
    matchLabel: "strong",
    roleFamily: "product_engineer",
    tags: ["Product Engineer", "growth", "React", "experiments", "UX", "B2C"],
  },
  {
    id: "pe3",
    name: "Tyler Freeman",
    headline: "Software Engineer · Backend-leaning",
    location: "Denver",
    experience: "7 yrs · APIs & services",
    highlight: "Excellent backend engineer — product instincts exist but mostly infra-facing work",
    matchScore: 70,
    matchLabel: "partial",
    roleFamily: "product_engineer",
    tags: ["Backend", "API", "services", "Go", "distributed"],
  },

  // ── Product Manager ───────────────────────────────────────────────────────
  {
    id: "pm1",
    name: "Sarah Lin",
    headline: "Product Manager · B2B SaaS",
    location: "Hong Kong",
    experience: "7 yrs · billing & growth",
    highlight: "Owned subscription roadmap at a payments startup — strong on metrics and GTM alignment",
    matchScore: 94,
    matchLabel: "strong",
    roleFamily: "product_manager",
    tags: ["Product", "PM", "B2B", "billing", "SaaS", "roadmap", "fintech"],
  },
  {
    id: "pm2",
    name: "Rachel Osei",
    headline: "Senior PM · Consumer & Marketplace",
    location: "Seattle",
    experience: "8 yrs · retail & two-sided marketplaces",
    highlight: "Led buyer experience at a large e-commerce org — understands scale, ops, and trust & safety",
    matchScore: 91,
    matchLabel: "strong",
    roleFamily: "product_manager",
    tags: ["PM", "marketplace", "e-commerce", "consumer", "scale", "retail"],
  },
  {
    id: "pm3",
    name: "Michael Torres",
    headline: "Technical PM · Platform & APIs",
    location: "New York",
    experience: "6 yrs · developer products",
    highlight: "PM for API platforms — technical depth but less consumer UX background",
    matchScore: 76,
    matchLabel: "partial",
    roleFamily: "product_manager",
    tags: ["PM", "API", "platform", "technical", "developer tools", "B2B"],
  },

  // ── Product Strategist ────────────────────────────────────────────────────
  {
    id: "pst1",
    name: "Amelia Chen",
    headline: "Senior Product Strategist · Platform & Ecosystem",
    location: "San Francisco",
    experience: "9 yrs · B2B SaaS & developer platforms",
    highlight: "Defined multi-year platform strategy at a Series C API company — market sizing, pricing, partner GTM",
    matchScore: 95,
    matchLabel: "strong",
    roleFamily: "product_manager",
    tags: ["Product Strategy", "platform", "GTM", "roadmap", "market sizing", "B2B", "SaaS", "pricing"],
  },
  {
    id: "pst2",
    name: "Jordan Blake",
    headline: "Product Strategist · Growth & Monetization",
    location: "New York",
    experience: "6 yrs · consumer subscriptions",
    highlight: "Led freemium-to-paid strategy for a 10M-user app — experimentation, cohort analysis, packaging",
    matchScore: 92,
    matchLabel: "strong",
    roleFamily: "product_manager",
    tags: ["Product Strategy", "growth", "monetization", "subscriptions", "consumer", "experiments", "packaging"],
  },
  {
    id: "pst3",
    name: "Nadia Okonkwo",
    headline: "Head of Product Strategy · Enterprise",
    location: "London",
    experience: "11 yrs · fintech & regulated industries",
    highlight: "Built enterprise product portfolio strategy — competitive intel, board-ready narratives, cross-product bets",
    matchScore: 94,
    matchLabel: "strong",
    roleFamily: "product_manager",
    tags: ["Product Strategy", "enterprise", "fintech", "portfolio", "competitive analysis", "executive", "roadmap"],
  },
  {
    id: "pst4",
    name: "Ethan Park",
    headline: "Product Strategist · AI Products",
    location: "Toronto",
    experience: "5 yrs · ML-powered SaaS",
    highlight: "Shaped AI feature strategy and build-vs-buy decisions — strong on user research, lighter on finance modeling",
    matchScore: 78,
    matchLabel: "partial",
    roleFamily: "product_manager",
    tags: ["Product Strategy", "AI", "ML", "SaaS", "user research", "build vs buy"],
  },
  {
    id: "pst5",
    name: "Sofia Martinez",
    headline: "Strategy & Operations · Product",
    location: "Austin",
    experience: "4 yrs · early-stage startups",
    highlight: "Generalist strategy support — OK on decks and ops, less experience owning end-to-end product strategy",
    matchScore: 65,
    matchLabel: "partial",
    roleFamily: "product_manager",
    tags: ["Strategy", "operations", "startup", "decks", "generalist"],
  },
  {
    id: "pst6",
    name: "Kevin Walsh",
    headline: "Management Consultant · Product Advisory",
    location: "Chicago",
    experience: "7 yrs · consulting",
    highlight: "Strong frameworks and stakeholder management — limited in-house product ship track record",
    matchScore: 58,
    matchLabel: "stretch",
    roleFamily: "product_manager",
    tags: ["Consulting", "strategy", "frameworks", "stakeholders", "advisory"],
  },

  // ── Backend / Platform / Data ─────────────────────────────────────────────
  {
    id: "be1",
    name: "Marcus Chen",
    headline: "Senior Backend Engineer · Go",
    location: "San Francisco",
    experience: "8 yrs · payments infra",
    highlight: "Deep distributed systems at a payments company — backend-heavy, minimal frontend",
    matchScore: 90,
    matchLabel: "strong",
    roleFamily: "backend",
    tags: ["Go", "Backend", "Distributed Systems", "payments", "fintech", "scale"],
  },
  {
    id: "pl1",
    name: "Mei Tanaka",
    headline: "Staff Engineer · Platform & SRE",
    location: "Tokyo",
    experience: "10 yrs · infra & reliability",
    highlight: "Led on-call and SRE for high-volume payment rails — strong at scale and incident response",
    matchScore: 93,
    matchLabel: "strong",
    roleFamily: "platform",
    tags: ["Platform", "SRE", "Infrastructure", "reliability", "payments", "scale", "high-volume"],
  },
  {
    id: "pl2",
    name: "Anika Verma",
    headline: "DevOps Engineer · Cloud & CI/CD",
    location: "Bangalore",
    experience: "6 yrs · AWS & Kubernetes",
    highlight: "Built deployment pipelines for microservices — Terraform, observability, cost optimization",
    matchScore: 87,
    matchLabel: "strong",
    roleFamily: "platform",
    tags: ["DevOps", "AWS", "Kubernetes", "Terraform", "CI/CD", "cloud"],
  },
  {
    id: "de1",
    name: "Carlos Mendez",
    headline: "Data Engineer · Pipelines & Warehousing",
    location: "São Paulo",
    experience: "5 yrs · analytics infra",
    highlight: "Spark, dbt, and warehouse modeling — feeds ML and BI teams at a fintech",
    matchScore: 88,
    matchLabel: "strong",
    roleFamily: "data_engineer",
    tags: ["Data Engineer", "Spark", "dbt", "warehouse", "ETL", "fintech", "analytics"],
  },

  // ── Sales & edge cases ────────────────────────────────────────────────────
  {
    id: "sa1",
    name: "David Park",
    headline: "Account Executive · Enterprise SaaS",
    location: "New York",
    experience: "4 yrs · $800k quota",
    highlight: "Closed 6-figure SaaS deals with technical buyers — knows how to sell to engineers",
    matchScore: 90,
    matchLabel: "strong",
    roleFamily: "sales",
    tags: ["Sales", "Enterprise", "SaaS", "AE", "B2B"],
  },
  {
    id: "unk1",
    name: "Alex Kim",
    headline: "Software Engineer",
    location: "Unknown",
    experience: "Profile sparse · 4 yrs claimed",
    highlight: "Limited public info — skills listed but background unverified",
    matchScore: 41,
    matchLabel: "unknown",
    roleFamily: "unknown",
    tags: ["Engineering", "Unknown background"],
  },
];

/** Related families — used when exact match pool is thin. */
const RELATED_FAMILIES: Partial<Record<CandidateRoleFamily, CandidateRoleFamily[]>> = {
  fullstack: ["frontend", "product_engineer", "backend"],
  frontend: ["fullstack", "uiux", "product_engineer"],
  backend: ["platform", "fullstack", "data_engineer"],
  uiux: ["product_engineer", "frontend"],
  ai_engineer: ["data_engineer", "backend"],
  product_engineer: ["fullstack", "frontend", "product_manager"],
  product_manager: ["product_engineer"],
  data_engineer: ["ai_engineer", "backend", "platform"],
  platform: ["backend", "data_engineer"],
  sales: [],
  unknown: [],
};

function roleBucket(
  roleName: string,
  jobDescription: string,
  requirements = "",
): CandidateRoleFamily {
  const text = `${roleName} ${jobDescription} ${requirements}`.toLowerCase();

  if (/\b(ai engineer|ml engineer|machine learning|llm|deep learning|nlp|generative ai)\b/.test(text))
    return "ai_engineer";
  if (/\b(ui\/ux|ux designer|ui designer|product designer|visual designer|design lead)\b/.test(text))
    return "uiux";
  if (/\bproduct engineer\b/.test(text)) return "product_engineer";
  if (/\b(product strategist|product strategy|strategic product|head of product strategy)\b/.test(text))
    return "product_manager";
  if (
    /\b(product manager|product management|product lead|group pm|technical program)\b/.test(text) &&
    !/\bproduct engineer\b/.test(text)
  )
    return "product_manager";
  if (/\b(data engineer|analytics engineer|data platform)\b/.test(text)) return "data_engineer";
  if (/\b(devops|sre|site reliability|platform engineer|infra engineer)\b/.test(text))
    return "platform";
  if (/\b(sales|account executive|business development|\bae\b|account manager)\b/.test(text))
    return "sales";
  if (
    /\b(backend|server-side|go engineer|java engineer|rust engineer)\b/.test(text) &&
    !/\bfull[\s-]?stack\b/.test(text)
  )
    return "backend";
  if (/\b(frontend|front-end|front end|react developer|vue developer)\b/.test(text) &&
    !/\bfull[\s-]?stack\b/.test(text))
    return "frontend";
  if (/\b(full[\s-]?stack|fullstack)\b/.test(text)) return "fullstack";
  if (/\b(staff engineer|principal engineer|platform)\b/.test(text)) return "platform";
  if (/\bengineer\b/.test(text)) return "fullstack";
  if (/\bdesign\b/.test(text)) return "uiux";
  if (/\bproduct\b/.test(text)) return "product_manager";
  return "fullstack";
}

function scoreCandidate(
  candidate: MockCandidateProfile,
  bucket: CandidateRoleFamily,
  roleText: string,
  intelligence: CompanyIntelligence,
): number {
  const tagStr = `${candidate.tags.join(" ")} ${candidate.highlight} ${candidate.experience} ${candidate.priorEmployers ?? ""}`.toLowerCase();
  const roleWords = roleText
    .toLowerCase()
    .split(/[\s,./]+/)
    .filter((w) => w.length > 3);

  let score = candidate.matchScore;

  if (candidate.roleFamily === bucket) score += 28;
  else if (RELATED_FAMILIES[bucket]?.includes(candidate.roleFamily)) score += 12;
  else if (candidate.roleFamily === "unknown") score -= 5;
  else score -= 15;

  const roleHits = roleWords.filter((w) => tagStr.includes(w)).length;
  score += Math.min(12, roleHits * 2);

  score += scoreCandidateForCompany(candidate, intelligence, roleText) * 5;

  if (candidate.matchLabel === "partial") score -= 4;
  if (candidate.matchLabel === "stretch") score -= 10;
  if (candidate.matchLabel === "unknown") score -= 20;

  return Math.min(99, Math.max(20, score));
}

function deriveMatchLabel(
  score: number,
  bucket: CandidateRoleFamily,
  candidate: MockCandidateProfile,
): MockCandidateProfile["matchLabel"] {
  if (candidate.roleFamily === "unknown") return "unknown";
  if (candidate.roleFamily === bucket && score >= 85) return "strong";
  if (score >= 78) return "strong";
  if (score >= 60) return "partial";
  return "stretch";
}

export function sourceCandidatesForRole(
  roleName: string,
  jobDescription: string,
  company?: CompanyContext,
  requirements = "",
  companyName?: string,
  companyIntelligence?: CompanyIntelligence | null,
): { scanned: MockCandidateProfile[]; matched: MockCandidateProfile; shortlist: MockCandidateProfile[] } {
  const bucket = roleBucket(roleName, jobDescription, requirements);
  const roleText = `${roleName} ${jobDescription} ${requirements}`;
  const intelligence = resolveIntelligence(company, companyIntelligence, companyName);

  const ranked = [...POOL]
    .map((c) => {
      const matchScore = scoreCandidate(c, bucket, roleText, intelligence);
      const matchLabel = deriveMatchLabel(matchScore, bucket, c);
      const highlight = tailorCandidateHighlight({ ...c, matchScore, matchLabel }, intelligence, roleText);
      return { ...c, matchScore, matchLabel, highlight };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  const matched = ranked[0];

  // Prefer same-role-family candidates in the pick list (e.g. all full stack devs)
  const sameFamily = ranked.filter((c) => c.roleFamily === bucket);
  const shortlist =
    sameFamily.length >= 6
      ? sameFamily.slice(0, 6)
      : [...sameFamily, ...ranked.filter((c) => c.roleFamily !== bucket)].slice(0, 6);

  const partial =
    ranked.find((c) => c.id !== matched.id && c.matchLabel === "partial") ??
    ranked.find((c) => c.id !== matched.id && c.roleFamily !== bucket) ??
    ranked[1];
  const stretch =
    ranked.find((c) => c.matchLabel === "stretch" && c.id !== matched.id && c.id !== partial?.id) ??
    ranked.find((c) => c.id !== matched.id && c.id !== partial?.id);
  const unknown =
    ranked.find((c) => c.matchLabel === "unknown") ??
    POOL.find((c) => c.roleFamily === "unknown")!;

  const scanned = [partial, unknown, stretch, matched].filter(
    (c, i, arr): c is MockCandidateProfile =>
      !!c && arr.findIndex((x) => x?.id === c.id) === i,
  );

  return { scanned, matched, shortlist };
}

export function candidateFirstName(candidate: MockCandidateProfile): string {
  return candidate.name.split(" ")[0] ?? candidate.name;
}

export function candidateContextBlock(
  candidate: MockCandidateProfile,
  company?: CompanyContext,
  companyName?: string,
  companyIntelligence?: CompanyIntelligence | null,
  roleText = "",
): string {
  const firstName = candidateFirstName(candidate);
  const intel = resolveIntelligence(company, companyIntelligence, companyName);
  const { companyName: display, isStrongMatch, narrative } = describeCompanyCandidateFit(
    company ?? { whoWeAre: "", culture: "", profilesWeHire: "", tone: "" },
    candidate,
    intel,
    roleText,
  );

  return [
    `Candidate you sourced and are reaching out to (you KNOW their name — use it):`,
    `- Name: ${candidate.name} — address them as "${firstName}"`,
    `- Headline: ${candidate.headline}`,
    `- Location: ${candidate.location}`,
    `- Experience: ${candidate.experience}`,
    `- Why they stood out: ${candidate.highlight}`,
    `- Match: ${candidate.matchScore}% (${candidate.matchLabel}) for this role at ${display}`,
    `- Fit read: ${isStrongMatch ? "Strong company fit" : "Partial/adjacent fit — ask smart questions, don't oversell"}`,
    `- Recruiting context: ${narrative}`,
    `- In every message: you are recruiting ${firstName} for a real role at ${display}. Stay consistent with their name.`,
  ]
    .filter(Boolean)
    .join("\n");
}
