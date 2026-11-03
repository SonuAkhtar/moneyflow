import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const lookup = vi.fn();
const rateLimit = vi.fn();
const rpc = (fn: string, args: unknown) =>
  fn === "hit_rate_limit" ? rateLimit(args) : lookup(fn, args);
const signInWithPassword = vi.fn();

vi.mock("@/config", () => ({
  env: { supabaseUrl: "http://sb.test", supabaseAnonKey: "anon", appUrl: "" },
  isSupabaseConfigured: true,
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ rpc, auth: { signInWithPassword } }),
}));

import { POST } from "./route";
import { signInIpLimiter, signInUsernameLimiter } from "@/lib/authLimits";

const call = (body: unknown, ip = "1.1.1.1") =>
  POST(
    new NextRequest("http://app.test/api/auth/sign-in", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

beforeEach(() => {
  lookup.mockReset();
  signInWithPassword.mockReset();
  // Shared limiter unreachable by default, so the in-memory fallback applies.
  rateLimit.mockReset();
  rateLimit.mockResolvedValue({ data: null, error: { code: "PGRST" } });
  signInIpLimiter.local.reset();
  signInUsernameLimiter.local.reset();
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
});
afterEach(() => {
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

describe("POST /api/auth/sign-in", () => {
  it("returns a session and never the email", async () => {
    lookup.mockResolvedValue({ data: "alice@example.com", error: null });
    signInWithPassword.mockResolvedValue({
      data: { session: { access_token: "a", refresh_token: "r" } },
      error: null,
    });
    const res = await call({ username: " Alice ", password: "pw" });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      session: { access_token: "a", refresh_token: "r" },
    });
    expect(JSON.stringify(body)).not.toContain("alice@example.com");
    expect(lookup).toHaveBeenCalledWith("email_for_username", {
      uname: "alice",
    });
  });

  it("gives unknown usernames the same error as a wrong password", async () => {
    lookup.mockResolvedValue({ data: null, error: null });
    const unknown = await call({ username: "nobody", password: "pw" });
    lookup.mockResolvedValue({ data: "a@b.c", error: null });
    signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { code: "invalid_credentials", status: 400 },
    });
    const wrong = await call({ username: "alice", password: "bad" });
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(await unknown.json()).toEqual(await wrong.json());
  });

  it("rejects malformed bodies", async () => {
    expect((await call("not json")).status).toBe(400);
    expect((await call({ username: "", password: "" })).status).toBe(401);
  });

  it("returns 502 when the lookup fails", async () => {
    lookup.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect((await call({ username: "alice", password: "pw" })).status).toBe(
      502,
    );
  });

  it("limits attempts per username", async () => {
    lookup.mockResolvedValue({ data: null, error: null });
    const codes: number[] = [];
    for (let i = 0; i < 6; i += 1)
      codes.push(
        (await call({ username: "alice", password: "x" }, `9.9.9.${i}`)).status,
      );
    expect(codes.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(codes[5]).toBe(429);
  });

  it("limits attempts per IP and sends Retry-After", async () => {
    lookup.mockResolvedValue({ data: null, error: null });
    let last: Response | undefined;
    for (let i = 0; i < 11; i += 1)
      last = await call({ username: `user${i}`, password: "x" }, "5.5.5.5");
    expect(last!.status).toBe(429);
    expect(Number(last!.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(lookup).toHaveBeenCalledTimes(10);
  });

  it("uses the shared limiter when it is reachable", async () => {
    rateLimit.mockResolvedValue({ data: 30, error: null });
    const res = await call({ username: "alice", password: "x" });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
    expect(rateLimit).toHaveBeenCalledWith({
      p_key: "sign-in-ip:1.1.1.1",
      p_max: 10,
      p_window_seconds: 60,
    });
    expect(lookup).not.toHaveBeenCalled();
  });

  it("is unavailable without a service role key", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect((await call({ username: "alice", password: "pw" })).status).toBe(
      503,
    );
    expect(lookup).not.toHaveBeenCalled();
  });

  it("maps auth outages and throttling instead of blaming the password", async () => {
    lookup.mockResolvedValue({ data: "a@b.c", error: null });
    const respond = async (error: object) => {
      signInWithPassword.mockResolvedValueOnce({
        data: { session: null },
        error,
      });
      return (await call({ username: "alice", password: "pw" })).status;
    };
    expect(await respond({ status: 429 })).toBe(429);
    expect(await respond({ status: 503 })).toBe(502);
    expect(await respond({ status: 0 })).toBe(502);
  });
});
