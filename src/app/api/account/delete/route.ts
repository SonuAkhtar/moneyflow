import { NextResponse, type NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "@/config";
import { clientIp, hitRateLimit } from "@/lib/rateLimit";
import { deleteAccountLimiter } from "@/lib/authLimits";
import { logger } from "@/lib/logger";

const AVATAR_PAGE = 100;

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status });

const removeAvatars = async (admin: SupabaseClient, userId: string) => {
  const avatars = admin.storage.from("avatars");
  for (;;) {
    const { data: files, error } = await avatars.list(userId, {
      limit: AVATAR_PAGE,
    });
    if (error) throw error;
    if (!files.length) return;
    const { error: removeError } = await avatars.remove(
      files.map((f) => `${userId}/${f.name}`),
    );
    if (removeError) throw removeError;
    if (files.length < AVATAR_PAGE) return;
  }
};

export async function POST(request: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isSupabaseConfigured || !serviceKey) {
    return json(
      { ok: false, message: "Account deletion isn't available right now." },
      503,
    );
  }

  const admin = createClient(env.supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const limit = await hitRateLimit(
    admin,
    deleteAccountLimiter,
    clientIp(request.headers),
  );
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

  const { data: auth, error: authError } = await admin.auth.getUser(token);
  const user = auth?.user;
  if (authError || !user)
    return json({ ok: false, message: "Not signed in" }, 401);

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return json(
      { ok: false, message: "Couldn't delete your account. Please try again." },
      500,
    );
  }

  try {
    await removeAvatars(admin, user.id);
  } catch (err) {
    logger.error("account.delete.avatars", err, { userId: user.id });
  }
  return json({ ok: true });
}
