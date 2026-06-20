import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api/route-errors";
import { callStructured } from "@/lib/ai/claude-client";
import { fetchCompanyPageText } from "@/lib/company/url-fetcher";

interface CompanyLookupResult {
  whoWeAre: string;
  profilesWeHire: string;
  culture: string;
  tone: string;
  suggestedFields: Array<"culture" | "tone" | "profilesWeHire">;
  sourceUrl: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: { url?: string } = await req.json();
    if (!body.url?.trim()) {
      return NextResponse.json({ error: "URL is required." }, { status: 400 });
    }

    const { url, text } = await fetchCompanyPageText(body.url);

    const result = await callStructured<CompanyLookupResult>({
      system: [
        "You extract company context from website text for a recruiting agent configuration.",
        "whoWeAre and profilesWeHire should be grounded in what the page actually says.",
        "culture and tone are your best inference from brand voice, careers language, and how the company presents itself.",
        "If hiring info is sparse, infer profilesWeHire from industry and product — but keep it plausible.",
        "Be concise — each field is 1-3 sentences max.",
      ].join(" "),
      prompt: [
        `Source URL: ${url}`,
        ``,
        `Website text (truncated):`,
        text,
        ``,
        `Extract:`,
        `- whoWeAre: what the company does, stage, product — factual from the page`,
        `- profilesWeHire: typical people they hire (infer from careers/about if needed)`,
        `- culture: suggested culture based on how they write about themselves`,
        `- tone: suggested outreach tone a recruiter for this company should use`,
        `- suggestedFields: which of culture, tone, profilesWeHire were inferred (usually culture and tone; include profilesWeHire if inferred)`,
        `- sourceUrl: repeat the source URL`,
      ].join("\n"),
      toolName: "extract_company_context",
      toolDescription: "Extract and suggest company onboarding fields from website text.",
      schema: {
        type: "object",
        properties: {
          whoWeAre: { type: "string" },
          profilesWeHire: { type: "string" },
          culture: { type: "string" },
          tone: { type: "string" },
          suggestedFields: {
            type: "array",
            items: {
              type: "string",
              enum: ["culture", "tone", "profilesWeHire"],
            },
          },
          sourceUrl: { type: "string" },
        },
        required: [
          "whoWeAre",
          "profilesWeHire",
          "culture",
          "tone",
          "suggestedFields",
          "sourceUrl",
        ],
      },
      maxTokens: 1200,
    });

    return NextResponse.json(result);
  } catch (err) {
    return jsonError(err);
  }
}
