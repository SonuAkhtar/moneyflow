import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const rpc = vi.fn();
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
  rpc.mockReset();
  signInWithPassword.mockReset();
  signInIpLimiter.reset();
  signInUsernameLimiter.reset();
});

describe("POST /api/auth/sign-in", () => {
  it("returns a session and never the email", async () => {
    rpc.mockResolvedValue({ data: "alice@example.com", error: null });
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
    expect(rpc).toHaveBeenCalledWith("email_for_username", { uname: "alice" });
  });

  it("gives unknown usernames the same error as a wrong password", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const unknown = await call({ username: "nobody", password: "pw" });
    rpc.mockResolvedValue({ data: "a@b.c", error: null });
    signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { code: "invalid_credentials" },
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
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect((await call({ username: "alice", password: "pw" })).status).toBe(
      502,
    );
  });

  it("limits attempts per username", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const codes: number[] = [];
    for (let i = 0; i < 6; i += 1)
      codes.push(
        (await call({ username: "alice", password: "x" }, `9.9.9.${i}`)).status,
      );
    expect(codes.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(codes[5]).toBe(429);
  });

  it("limits attempts per IP and sends Retry-After", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    let last: Response | undefined;
    for (let i = 0; i < 11; i += 1)
      last = await call({ username: `user${i}`, password: "x" }, "5.5.5.5");
    expect(last!.status).toBe(429);
    expect(Number(last!.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(rpc).toHaveBeenCalledTimes(10);
  });
});
