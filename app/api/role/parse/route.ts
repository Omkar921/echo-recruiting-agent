import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api/route-errors";
import { callStructured } from "@/lib/ai/claude-client";
import { fetchCompanyPageText } from "@/lib/company/url-fetcher";
import type { CompanyContext } from "@/lib/types";

export interface RoleParseResult {
  roleName: string;
  jobDescription: string;
  requirements: string;
  goal: string;
  suggestedFields: Array<"requirements" | "goal">;
  source: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: {
      url?: string;
      text?: string;
      company?: CompanyContext;
      companyName?: string;
    } = await req.json();

    const pasted = body.text?.trim();
    const hasUrl = Boolean(body.url?.trim());

    if (!hasUrl && !pasted) {
      return NextResponse.json(
        { error: "Provide a job posting URL or paste the job description." },
        { status: 400 },
      );
    }

    let source = "pasted job description";
    let pageText = pasted ?? "";

    if (hasUrl) {
      const fetched = await fetchCompanyPageText(body.url!.trim());
      source = fetched.url;
      pageText = pasted ? `${pasted}\n\n---\n\n${fetched.text}` : fetched.text;
    }

    if (pageText.length < 40) {
      return NextResponse.json(
        { error: "Not enough text to parse. Paste a fuller job description." },
        { status: 400 },
      );
    }

    const companyBlock = body.company
      ? [
          `Hiring company: ${body.companyName?.trim() || "the configured company"}`,
          `Who they are: ${body.company.whoWeAre}`,
          `Culture: ${body.company.culture}`,
          `Profiles they hire: ${body.company.profilesWeHire}`,
        ].join("\n")
      : "";

    const result = await callStructured<RoleParseResult>({
      system: [
        "You extract structured hiring intent from job posting text for an autonomous recruiting agent.",
        "roleName and jobDescription must reflect what the posting actually says.",
        "requirements: bullet-style must-haves (years, skills, location, comp if mentioned) — concise.",
        "goal: one sentence on what the recruiter should achieve (e.g. book a 30-min intro call) — infer from seniority and company if not stated.",
        "If requirements or goal were inferred rather than explicit, list them in suggestedFields.",
        "Be concise. No markdown. Plain text only.",
      ].join(" "),
      prompt: [
        companyBlock,
        companyBlock ? "" : "",
        `Source: ${source}`,
        "",
        "Job posting text:",
        pageText.slice(0, 14_000),
        "",
        "Return roleName, jobDescription (2-4 sentences on day-to-day ownership), requirements, goal, suggestedFields, source.",
      ]
        .filter(Boolean)
        .join("\n"),
      toolName: "extract_role_intent",
      toolDescription: "Extract role, JD, requirements, and outreach goal from job posting text.",
      schema: {
        type: "object",
        properties: {
          roleName: { type: "string" },
          jobDescription: { type: "string" },
          requirements: { type: "string" },
          goal: { type: "string" },
          suggestedFields: {
            type: "array",
            items: { type: "string", enum: ["requirements", "goal"] },
          },
          source: { type: "string" },
        },
        required: [
          "roleName",
          "jobDescription",
          "requirements",
          "goal",
          "suggestedFields",
          "source",
        ],
      },
      maxTokens: 1200,
    });

    return NextResponse.json({ ...result, source });
  } catch (err) {
    return jsonError(err);
  }
}
