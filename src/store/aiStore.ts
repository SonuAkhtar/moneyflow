"use client";

import { create } from "zustand";
import { aiService } from "@/services/ai.service";
import { createId, isoNow } from "@/utils";
import type {
  AiChatMessage,
  AiFinancialSnapshot,
  AiGeneratedInsight,
} from "@/types";

interface AiState {
  insights: AiGeneratedInsight[];
  summary: string;
  loadingInsights: boolean;
  generatedAt: string | null;
  messages: AiChatMessage[];
  thinking: boolean;
  generateInsights: (snapshot: AiFinancialSnapshot) => Promise<void>;
  sendMessage: (snapshot: AiFinancialSnapshot, text: string) => Promise<void>;
  resetChat: () => void;
}

const WELCOME: AiChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hey, I'm your moneyFlow assistant. Ask me anything about your spending, savings, EMIs or goals.",
  createdAt: isoNow(),
};

export const useAiStore = create<AiState>((set) => ({
  insights: [],
  summary: "",
  loadingInsights: false,
  generatedAt: null,
  messages: [WELCOME],
  thinking: false,

  generateInsights: async (snapshot) => {
    set({ loadingInsights: true });
    const res = await aiService.getInsights(snapshot);
    set({
      insights: res.insights,
      summary: res.summary,
      loadingInsights: false,
      generatedAt: isoNow(),
    });
  },

  sendMessage: async (snapshot, text) => {
    const userMessage: AiChatMessage = {
      id: createId("msg"),
      role: "user",
      content: text,
      createdAt: isoNow(),
    };
    set((s) => ({ messages: [...s.messages, userMessage], thinking: true }));
    const reply = await aiService.chat(snapshot, text);
    set((s) => ({
      messages: [
        ...s.messages,
        { id: createId("msg"), role: "assistant", content: reply, createdAt: isoNow() },
      ],
      thinking: false,
    }));
  },

  resetChat: () => set({ messages: [WELCOME] }),
}));
