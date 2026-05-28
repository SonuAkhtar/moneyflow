import { NextResponse } from "next/server";
import { getGeminiModel, extractJson } from "@/lib/gemini/client";
import { INSIGHT_SYSTEM, buildInsightPrompt } from "@/lib/gemini/prompts";
import { heuristicInsights } from "@/services/insight-engine";
import type { AiFinancialSnapshot, AiInsightResponse } from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let snapshot: AiFinancialSnapshot;
  try {
    const body = (await request.json()) as { snapshot: AiFinancialSnapshot };
    snapshot = body.snapshot;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const model = getGeminiModel(INSIGHT_SYSTEM);
  if (!model) {
    return NextResponse.json(heuristicInsights(snapshot));
  }

  try {
    const result = await model.generateContent(buildInsightPrompt(snapshot));
    const parsed = extractJson<AiInsightResponse>(result.response.text());
    if (parsed?.insights?.length) {
      return NextResponse.json(parsed);
    }
    return NextResponse.json(heuristicInsights(snapshot));
  } catch {
    return NextResponse.json(heuristicInsights(snapshot));
  }
}
