import { NextResponse } from "next/server";
import { getGeminiModel } from "@/lib/gemini/client";
import { CHAT_SYSTEM, buildSnapshotContext } from "@/lib/gemini/prompts";
import { heuristicChatReply } from "@/services/insight-engine";
import type { AiFinancialSnapshot } from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let snapshot: AiFinancialSnapshot;
  let question: string;
  try {
    const body = (await request.json()) as {
      snapshot: AiFinancialSnapshot;
      question: string;
    };
    snapshot = body.snapshot;
    question = body.question;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const model = getGeminiModel(CHAT_SYSTEM);
  if (!model) {
    return NextResponse.json({ reply: heuristicChatReply(snapshot, question) });
  }

  try {
    const prompt = `${buildSnapshotContext(snapshot)}\n\nUser question: ${question}`;
    const result = await model.generateContent(prompt);
    const reply = result.response.text().trim();
    return NextResponse.json({
      reply: reply || heuristicChatReply(snapshot, question),
    });
  } catch {
    return NextResponse.json({ reply: heuristicChatReply(snapshot, question) });
  }
}
