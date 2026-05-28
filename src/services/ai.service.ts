"use client";

import type { AiFinancialSnapshot, AiInsightResponse } from "@/types";
import { heuristicChatReply, heuristicInsights } from "./insight-engine";

export const aiService = {
  async getInsights(snapshot: AiFinancialSnapshot): Promise<AiInsightResponse> {
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot }),
      });
      if (!res.ok) throw new Error("insight request failed");
      return (await res.json()) as AiInsightResponse;
    } catch {
      return heuristicInsights(snapshot);
    }
  },

  async chat(snapshot: AiFinancialSnapshot, question: string): Promise<string> {
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot, question }),
      });
      if (!res.ok) throw new Error("chat request failed");
      const data = (await res.json()) as { reply: string };
      return data.reply;
    } catch {
      return heuristicChatReply(snapshot, question);
    }
  },
};
