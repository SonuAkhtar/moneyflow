import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env, isSupabaseConfigured } from "@/config";
import type { Database } from "./database.types";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const AUTH_PATHS = ["/login", "/signup", "/forgot-password"];
const RECOVERY_PATHS = ["/verify", "/reset-password"];
const PUBLIC_PATHS = ["/offline"];

const startsWithAny = (path: string, prefixes: string[]) =>
  prefixes.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(p));

export const updateSession = async (request: NextRequest) => {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient<Database>(
    env.supabaseUrl,
    env.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const onAuthPath = startsWithAny(path, AUTH_PATHS);
  const onRecoveryPath = startsWithAny(path, RECOVERY_PATHS);
  const onPublicPath = startsWithAny(path, PUBLIC_PATHS);

  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (!user && !onAuthPath && !onRecoveryPath && !onPublicPath) {
    if (path.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return redirectTo("/login");
  }
  if (user && onAuthPath) {
    return redirectTo("/");
  }

  return response;
};
