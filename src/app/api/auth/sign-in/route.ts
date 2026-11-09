import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "@/config";
import { clientIp, hitRateLimit } from "@/lib/rateLimit";
import {
  signInAccountLimiter,
  signInIpLimiter,
  signInUsernameLimiter,
} from "@/lib/authLimits";

const INVALID = "Invalid username or password";

const tooMany = (retryAfter: number) =>
  NextResponse.json(
    { ok: false, message: "Too many attempts. Try again in a minute." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );

const unavailable = () =>
  NextResponse.json(
    { ok: false, message: "Sign-in is unavailable, please try again." },
    { status: 502 },
  );

const serverClient = (key: string) =>
  createClient(env.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

export async function POST(request: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isSupabaseConfigured || !serviceKey) {
    return NextResponse.json(
      { ok: false, message: "Username sign-in isn't configured." },
      { status: 503 },
    );
  }
  const admin = serverClient(serviceKey);

  const ip = clientIp(request.headers);
  const byIp = await hitRateLimit(admin, signInIpLimiter, ip);
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
  const byUser = await hitRateLimit(
    admin,
    signInUsernameLimiter,
    `${username}:${ip}`,
  );
  if (!byUser.ok) return tooMany(byUser.retryAfter);
  const byAccount = await hitRateLimit(admin, signInAccountLimiter, username);
  if (!byAccount.ok) return tooMany(byAccount.retryAfter);

  const { data: email, error: lookupError } = await admin.rpc(
    "email_for_username",
    { uname: username },
  );
  if (lookupError) return unavailable();
  if (typeof email !== "string" || !email) {
    return NextResponse.json({ ok: false, message: INVALID }, { status: 401 });
  }

  const { data, error } = await serverClient(
    env.supabaseAnonKey,
  ).auth.signInWithPassword({ email, password });
  if (error) {
    if (error.status === 429)
      return NextResponse.json(
        {
          ok: false,
          message:
            "Too many sign-ins right now. Sign in with your email instead.",
        },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    if (!error.status || error.status >= 500) return unavailable();
    const unconfirmed = error.code === "email_not_confirmed";
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
  if (!data.session) {
    return NextResponse.json({ ok: false, message: INVALID }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  });
}
