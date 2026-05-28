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
  fullName?: string;
}

export const authService = {
  isRemote(): boolean {
    return getBrowserSupabase() !== null;
  },

  async signUp(input: SignUpInput): Promise<AuthResult> {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      return {
        ok: true,
        needsVerification: false,
        email: input.email,
        fullName: input.fullName,
        userId: `demo_${input.email}`,
      };
    }
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { full_name: input.fullName },
        emailRedirectTo: `${env.appUrl}/verify`,
      },
    });
    if (error) return { ok: false, message: error.message };
    return {
      ok: true,
      needsVerification: !data.session,
      userId: data.user?.id,
      email: input.email,
      fullName: input.fullName,
    };
  },

  async signIn(input: SignInInput): Promise<AuthResult> {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      return { ok: true, email: input.email, userId: `demo_${input.email}` };
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error) return { ok: false, message: error.message };
    return {
      ok: true,
      userId: data.user?.id,
      email: data.user?.email ?? input.email,
      fullName: (data.user?.user_metadata?.full_name as string) ?? "",
    };
  },

  async signOut(): Promise<void> {
    const supabase = getBrowserSupabase();
    if (supabase) await supabase.auth.signOut();
  },

  async resetPassword(email: string): Promise<AuthResult> {
    const supabase = getBrowserSupabase();
    if (!supabase) return { ok: true, email };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${env.appUrl}/login`,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true, email };
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
      fullName: (data.user.user_metadata?.full_name as string) ?? "",
    };
  },
};
