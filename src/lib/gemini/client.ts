import { GoogleGenerativeAI } from "@google/generative-ai";
import { env, isGeminiConfigured } from "@/config";

let cached: GoogleGenerativeAI | null = null;

const getClient = (): GoogleGenerativeAI | null => {
  if (!isGeminiConfigured) return null;
  if (!cached) cached = new GoogleGenerativeAI(env.geminiApiKey);
  return cached;
};

export const getGeminiModel = (system?: string) => {
  const client = getClient();
  if (!client) return null;
  return client.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: system,
    generationConfig: {
      temperature: 0.6,
      topP: 0.9,
      maxOutputTokens: 1024,
    },
  });
};

export const extractJson = <T>(raw: string): T | null => {
  const match = raw.match(/```json\s*([\s\S]*?)```/) ?? raw.match(/\{[\s\S]*\}/);
  const candidate = match ? (match[1] ?? match[0]) : raw;
  try {
    return JSON.parse(candidate.trim()) as T;
  } catch {
    return null;
  }
};
