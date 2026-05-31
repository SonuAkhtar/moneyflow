import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { env, isSupabaseConfigured } from "@/config";
import type { Database } from "./database.types";

type CookieToSet = { name: string; value: string; options: CookieOptions };

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
        } catch {}
      },
    },
  });
};

export const getServerUser = async () => {
  const supabase = await getServerSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
};
