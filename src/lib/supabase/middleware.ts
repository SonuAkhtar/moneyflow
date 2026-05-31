import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env, isSupabaseConfigured } from "@/config";
import type { Database } from "./database.types";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Auth pages: signed-in users are bounced away from these.
const AUTH_PATHS = ["/login", "/signup", "/forgot-password"];
// Recovery / verification links carry their own session — always allowed.
const RECOVERY_PATHS = ["/verify", "/reset-password"];
// Public, no auth required.
const PUBLIC_PATHS = ["/offline"];

const startsWithAny = (path: string, prefixes: string[]) =>
  prefixes.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(p));

// Refreshes the Supabase session cookie AND enforces route protection:
// unauthenticated users are redirected to /login; authenticated users are kept
// out of the auth pages. Cookies refreshed by getUser() are preserved on redirects.
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
    // Carry over any refreshed session cookies.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  // Unauthenticated → only auth / recovery / public routes are reachable.
  if (!user && !onAuthPath && !onRecoveryPath && !onPublicPath) {
    // API routes get a clean 401 (a redirect would hand back HTML).
    if (path.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return redirectTo("/login");
  }
  // Authenticated → keep out of login/signup/forgot.
  if (user && onAuthPath) {
    return redirectTo("/");
  }

  return response;
};
