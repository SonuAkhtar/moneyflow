import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const log: string[] = [];
const getUser = vi.fn();
const deleteUser = vi.fn();
let failTable: string | null = null;

vi.mock("@/config", () => ({
  env: { supabaseUrl: "http://sb.test", supabaseAnonKey: "anon", appUrl: "" },
  isSupabaseConfigured: true,
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { getUser, admin: { deleteUser } },
    storage: {
      from: () => ({
        list: async () => ({ data: [{ name: "a.jpg" }] }),
        remove: async (paths: string[]) => {
          log.push(`storage.remove:${paths.join(",")}`);
          return { error: null };
        },
      }),
    },
    from: (table: string) => ({
      delete: () => ({
        eq: async (column: string, value: string) => {
          log.push(`delete:${table}:${column}=${value}`);
          return { error: table === failTable ? { message: "x" } : null };
        },
      }),
    }),
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
  failTable = null;
  getUser.mockReset();
  deleteUser.mockReset();
  deleteAccountLimiter.reset();
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

  it("deletes the user's files, rows, then the auth user", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    deleteUser.mockResolvedValue({ error: null });
    const res = await call("good");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(log).toEqual([
      "storage.remove:u1/a.jpg",
      "delete:borrowing_payments:user_id=u1",
      "delete:borrowings:user_id=u1",
      "delete:emi_payments:user_id=u1",
      "delete:emis:user_id=u1",
      "delete:transactions:user_id=u1",
      "delete:profiles:id=u1",
      "delete:accounts:user_id=u1",
    ]);
    expect(deleteUser).toHaveBeenCalledWith("u1");
  });

  it("stops before deleting the login if a data delete fails", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    failTable = "emis";
    expect((await call("good")).status).toBe(500);
    expect(deleteUser).not.toHaveBeenCalled();
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
