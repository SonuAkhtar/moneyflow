"use client";

import { getBrowserSupabase } from "@/lib/supabase/client";
import { env } from "@/config";
import type { SignInInput, SignUpInput } from "@/types";

export interface AuthResult {
  ok: boolean;
  message?: string;
  needsVerification?: boolean;
  userId?: string;
  email?: string;
  username?: string | null;
  fullName?: string;
}

const NOT_CONFIGURED: AuthResult = {
  ok: false,
  message:
    "Supabase isn't configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and restart.",
};

const isEmail = (value: string) =>
  /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim());

const authRedirectBase = (): string =>
  typeof window !== "undefined" ? window.location.origin : env.appUrl;

export const authService = {
  isRemote(): boolean {
    return getBrowserSupabase() !== null;
  },

  async signUp(input: SignUpInput): Promise<AuthResult> {
    const supabase = getBrowserSupabase();
    if (!supabase) return NOT_CONFIGURED;

    const username = input.username.trim().toLowerCase();

    const { data: available, error: rpcError } = await supabase.rpc(
      "username_available",
      { uname: username } as never,
    );
    if (rpcError) return { ok: false, message: rpcError.message };
    if (available === false)
      return { ok: false, message: "That username is taken" };

    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { full_name: input.fullName, username },
        emailRedirectTo: `${authRedirectBase()}/auth/callback?next=/`,
      },
    });
    if (error) return { ok: false, message: error.message };
    return {
      ok: true,
      needsVerification: !data.session,
      userId: data.user?.id,
      email: input.email,
      username,
      fullName: input.fullName,
    };
  },

  async signIn(input: SignInInput): Promise<AuthResult> {
    const supabase = getBrowserSupabase();
    if (!supabase) return NOT_CONFIGURED;

    let email = input.identifier.trim();
    if (!isEmail(email)) {
      const { data, error } = await supabase.rpc("email_for_username", {
        uname: email.toLowerCase(),
      } as never);
      if (error) return { ok: false, message: error.message };
      if (!data)
        return { ok: false, message: "No account found for that username" };
      email = data as string;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: input.password,
    });
    if (error) return { ok: false, message: error.message };
    return {
      ok: true,
      userId: data.user?.id,
      email: data.user?.email ?? email,
      username: (data.user?.user_metadata?.username as string) ?? null,
      fullName: (data.user?.user_metadata?.full_name as string) ?? "",
    };
  },

  async signOut(): Promise<void> {
    const supabase = getBrowserSupabase();
    if (supabase) await supabase.auth.signOut();
  },

  async resetPassword(email: string): Promise<AuthResult> {
    const supabase = getBrowserSupabase();
    if (!supabase) return NOT_CONFIGURED;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${authRedirectBase()}/auth/callback?next=/reset-password`,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true, email };
  },

  async resendVerification(email: string): Promise<AuthResult> {
    const supabase = getBrowserSupabase();
    if (!supabase) return NOT_CONFIGURED;
    if (!isEmail(email))
      return { ok: false, message: "Enter a valid email address" };
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${authRedirectBase()}/auth/callback?next=/`,
      },
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true, email };
  },

  async updatePassword(password: string): Promise<AuthResult> {
    const supabase = getBrowserSupabase();
    if (!supabase) return NOT_CONFIGURED;
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  },

  async currentSession(): Promise<AuthResult | null> {
    const supabase = getBrowserSupabase();
    if (!supabase) return null;
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    return {
      ok: true,
      userId: data.user.id,
      email: data.user.email ?? "",
      username: (data.user.user_metadata?.username as string) ?? null,
      fullName: (data.user.user_metadata?.full_name as string) ?? "",
    };
  },
};
