import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const log: string[] = [];
const getUser = vi.fn();
const deleteUser = vi.fn(async (id: string) => {
  log.push(`deleteUser:${id}`);
  return deleteResult;
});
let deleteResult: { error: unknown } = { error: null };
let files: { name: string }[] = [];
let removeError: unknown = null;

vi.mock("@/config", () => ({
  env: { supabaseUrl: "http://sb.test", supabaseAnonKey: "anon", appUrl: "" },
  isSupabaseConfigured: true,
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { getUser, admin: { deleteUser } },
    rpc: async () => ({ data: null, error: { code: "PGRST" } }),
    storage: {
      from: () => ({
        list: async () => ({ data: files, error: null }),
        remove: async (paths: string[]) => {
          log.push(`storage.remove:${paths.join(",")}`);
          if (removeError) return { error: removeError };
          files = [];
          return { error: null };
        },
      }),
    },
  }),
}));

import { POST } from "./route";
import { deleteAccountLimiter } from "@/lib/authLimits";

const call = (token?: string, ip = "1.1.1.1") =>
  POST(
    new NextRequest("http://app.test/api/account/delete", {
      method: "POST",
      headers: {
        "x-forwarded-for": ip,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    }),
  );

beforeEach(() => {
  log.length = 0;
  files = [{ name: "a.jpg" }];
  deleteResult = { error: null };
  removeError = null;
  getUser.mockReset();
  deleteUser.mockClear();
  deleteAccountLimiter.local.reset();
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
});
afterEach(() => {
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

describe("POST /api/account/delete", () => {
  it("is unavailable without a service role key", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect((await call("t")).status).toBe(503);
  });

  it("requires a valid session token", async () => {
    expect((await call()).status).toBe(401);
    getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "bad" },
    });
    expect((await call("bad")).status).toBe(401);
    expect(log).toEqual([]);
  });

  it("removes the files, then deletes the auth user (rows cascade)", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const res = await call("good");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(log).toEqual(["storage.remove:u1/a.jpg", "deleteUser:u1"]);
  });

  it("keeps the account if the photos can't be removed, so no photo is left public", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    files = [{ name: "a.jpg" }];
    removeError = { message: "storage down" };
    expect((await call("good")).status).toBe(500);
    expect(log).toEqual(["storage.remove:u1/a.jpg"]);
  });

  it("reports a failure when the auth user can't be deleted", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    deleteResult = { error: { message: "x" } };
    expect((await call("good")).status).toBe(500);
    expect(log.at(-1)).toBe("deleteUser:u1");
  });

  it("rate limits repeated attempts", async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "bad" },
    });
    const codes = [];
    for (let i = 0; i < 4; i += 1)
      codes.push((await call("x", "7.7.7.7")).status);
    expect(codes).toEqual([401, 401, 401, 429]);
  });
});
