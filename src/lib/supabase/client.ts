"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env, isSupabaseConfigured } from "@/config";
import type { Database } from "./database.types";

export type SupabaseBrowserClient = ReturnType<
  typeof createBrowserClient<Database>
>;

let cached: SupabaseBrowserClient | null = null;

export const getBrowserSupabase = (): SupabaseBrowserClient | null => {
  if (!isSupabaseConfigured) return null;
  if (!cached) {
    cached = createBrowserClient<Database>(
      env.supabaseUrl,
      env.supabaseAnonKey,
    );
  }
  return cached;
};

export const requireBrowserSupabase = (): SupabaseBrowserClient => {
  const client = getBrowserSupabase();
  if (!client) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return client;
};
