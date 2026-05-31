import { APP } from "@/constants";

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;

export const isSupabaseConfigured =
  Boolean(env.supabaseUrl) && Boolean(env.supabaseAnonKey);

export const siteConfig = {
  name: APP.name,
  title: `${APP.name} - ${APP.tagline}`,
  description: APP.description,
  themeColor: "#0b0c0e",
  accentColor: "#4ece6e",
  keywords: [
    "finance",
    "expense tracker",
    "savings",
    "fintech",
    "AI finance assistant",
  ],
} as const;
