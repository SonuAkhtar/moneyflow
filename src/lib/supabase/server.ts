import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { env, isSupabaseConfigured } from "@/config";
import type { Database } from "./database.types";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Server-side Supabase client for Server Components / Route Handlers.
// Reads & writes the auth session cookies via next/headers.
export const getServerSupabase = async () => {
  if (!isSupabaseConfigured) return null;
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component (read-only cookies) — the middleware
          // refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
};

// Current authenticated user on the server, or null.
export const getServerUser = async () => {
  const supabase = await getServerSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
};
