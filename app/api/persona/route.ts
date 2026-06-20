import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api/route-errors";
import { Agent } from "@/lib/agent";
import { resolveCompanyIntelligence } from "@/lib/company/intelligence";
import { isCompanyContextValid } from "@/lib/session/keys";
import type { CompanyContext } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body: CompanyContext & { companyName?: string } = await req.json();
    const { companyName, ...company } = body;

    if (!isCompanyContextValid(company)) {
      return NextResponse.json({ error: "Missing company context fields." }, { status: 400 });
    }

    const [persona, companyIntelligence] = await Promise.all([
      Agent.create(company, companyName).then((agent) => agent.persona),
      resolveCompanyIntelligence(company, companyName),
    ]);

    return NextResponse.json({ persona, companyIntelligence });
  } catch (err) {
    return jsonError(err);
  }
}
