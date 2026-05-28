"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env, isSupabaseConfigured } from "@/config";

let cached: ReturnType<typeof createBrowserClient> | null = null;

export const getBrowserSupabase = () => {
  if (!isSupabaseConfigured) return null;
  if (!cached) {
    cached = createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
  }
  return cached;
};
