import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "@/config";
import { clientIp } from "@/lib/rateLimit";
import { deleteAccountLimiter } from "@/lib/authLimits";

const USER_TABLES = [
  "borrowing_payments",
  "borrowings",
  "emi_payments",
  "emis",
  "transactions",
  "profiles",
  "accounts",
] as const;

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status });

export async function POST(request: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isSupabaseConfigured || !serviceKey) {
    return json(
      { ok: false, message: "Account deletion isn't available right now." },
      503,
    );
  }

  const limit = deleteAccountLimiter.check(clientIp(request.headers));
  if (!limit.ok) {
    return json(
      { ok: false, message: "Too many attempts. Try again later." },
      429,
    );
  }

  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ ok: false, message: "Not signed in" }, 401);

  const admin = createClient(env.supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  const user = auth?.user;
  if (authError || !user)
    return json({ ok: false, message: "Not signed in" }, 401);

  const avatars = admin.storage.from("avatars");
  const { data: files } = await avatars.list(user.id);
  if (files?.length) {
    await avatars.remove(files.map((f) => `${user.id}/${f.name}`));
  }

  for (const table of USER_TABLES) {
    const column = table === "profiles" ? "id" : "user_id";
    const { error } = await admin.from(table).delete().eq(column, user.id);
    if (error) {
      return json(
        { ok: false, message: "Couldn't delete your data. Please try again." },
        500,
      );
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return json(
      { ok: false, message: "Couldn't delete your account. Please try again." },
      500,
    );
  }
  return json({ ok: true });
}
