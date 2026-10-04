import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "@/config";
import { clientIp } from "@/lib/rateLimit";
import { signInIpLimiter, signInUsernameLimiter } from "@/lib/authLimits";

const INVALID = "Invalid username or password";

const tooMany = (retryAfter: number) =>
  NextResponse.json(
    { ok: false, message: "Too many attempts. Try again in a minute." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );

const serverClient = (key: string) =>
  createClient(env.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { ok: false, message: "Supabase isn't configured." },
      { status: 500 },
    );
  }

  const byIp = signInIpLimiter.check(clientIp(request.headers));
  if (!byIp.ok) return tooMany(byIp.retryAfter);

  let username = "";
  let password = "";
  try {
    const body = (await request.json()) as {
      username?: unknown;
      password?: unknown;
    };
    username = typeof body.username === "string" ? body.username : "";
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request" },
      { status: 400 },
    );
  }
  username = username.trim().toLowerCase();
  if (!username || !password) {
    return NextResponse.json({ ok: false, message: INVALID }, { status: 401 });
  }
  const byUser = signInUsernameLimiter.check(username);
  if (!byUser.ok) return tooMany(byUser.retryAfter);

  const lookup = serverClient(
    process.env.SUPABASE_SERVICE_ROLE_KEY || env.supabaseAnonKey,
  );
  const { data: email, error: lookupError } = await lookup.rpc(
    "email_for_username",
    { uname: username },
  );
  if (lookupError) {
    return NextResponse.json(
      { ok: false, message: "Sign-in is unavailable, please try again." },
      { status: 502 },
    );
  }
  if (typeof email !== "string" || !email) {
    return NextResponse.json({ ok: false, message: INVALID }, { status: 401 });
  }

  const { data, error } = await serverClient(
    env.supabaseAnonKey,
  ).auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    const unconfirmed = error?.code === "email_not_confirmed";
    return NextResponse.json(
      {
        ok: false,
        message: unconfirmed
          ? "Confirm your email before signing in."
          : INVALID,
      },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  });
}
