import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const SUPABASE_STUBS = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}'
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text,
  name text
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;
grant usage on schema storage to authenticated, anon;
grant select, insert, update, delete on storage.objects to authenticated;
`;

const ALICE = "11111111-1111-1111-1111-111111111111";
const BOB = "22222222-2222-2222-2222-222222222222";

let db: PGlite;

const as = async <T>(
  role: string,
  uid: string | null,
  fn: () => Promise<T>,
) => {
  await db.exec(`set role ${role}`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [
    uid ?? "",
  ]);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
};

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(SUPABASE_STUBS);
  const dir = path.join(__dirname, "..", "migrations");
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    await db.exec(readFileSync(path.join(dir, file), "utf8"));
  }
  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values
      ($1, 'alice@example.com', '{"username":"Alice","full_name":"Alice A"}'),
      ($2, 'bob@example.com', '{"username":"bob","full_name":"Bob B"}')`,
    [ALICE, BOB],
  );
});

describe("baseline migration", () => {
  it("is idempotent", async () => {
    const dir = path.join(__dirname, "..", "migrations");
    for (const file of readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort()) {
      await expect(
        db.exec(readFileSync(path.join(dir, file), "utf8")),
      ).resolves.toBeDefined();
    }
  });

  it("creates a profile for every new auth user", async () => {
    const { rows } = await db.query<{ username: string; full_name: string }>(
      "select username, full_name from public.profiles where id = $1",
      [ALICE],
    );
    expect(rows[0]).toEqual({ username: "alice", full_name: "Alice A" });
  });

  it("isolates rows between users", async () => {
    await as("authenticated", ALICE, () =>
      db.query(
        "insert into public.accounts (id, user_id, name, balance) values ('aaaaaaaa-0000-0000-0000-000000000001', $1, 'HDFC', 1000)",
        [ALICE],
      ),
    );
    const seen = await as("authenticated", BOB, () =>
      db.query("select id from public.accounts"),
    );
    expect(seen.rows).toHaveLength(0);
    const profiles = await as("authenticated", BOB, () =>
      db.query<{ id: string }>("select id from public.profiles"),
    );
    expect(profiles.rows.map((r) => r.id)).toEqual([BOB]);
  });

  it("blocks writing rows for another user or into their account", async () => {
    await expect(
      as("authenticated", BOB, () =>
        db.query(
          "insert into public.accounts (user_id, name) values ($1, 'stolen')",
          [ALICE],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as("authenticated", BOB, () =>
        db.query(
          `insert into public.transactions (user_id, account_id, type, amount, category)
           values ($1, 'aaaaaaaa-0000-0000-0000-000000000001', 'expense', 10, 'food')`,
          [BOB],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
    const updated = await as("authenticated", BOB, () =>
      db.query(
        "update public.accounts set balance = 0 where id = 'aaaaaaaa-0000-0000-0000-000000000001' returning id",
      ),
    );
    expect(updated.rows).toHaveLength(0);
  });

  it("supports the compare-and-swap balance update used by the app", async () => {
    const hit = await as("authenticated", ALICE, () =>
      db.query(
        "update public.accounts set balance = 900.5 where id = 'aaaaaaaa-0000-0000-0000-000000000001' and balance = 1000 returning id",
      ),
    );
    expect(hit.rows).toHaveLength(1);
    const miss = await as("authenticated", ALICE, () =>
      db.query(
        "update public.accounts set balance = 1 where id = 'aaaaaaaa-0000-0000-0000-000000000001' and balance = 1000 returning id",
      ),
    );
    expect(miss.rows).toHaveLength(0);
  });

  it("restricts email_for_username to the service role", async () => {
    await expect(
      as("anon", null, () =>
        db.query("select public.email_for_username('alice')"),
      ),
    ).rejects.toThrow(/permission denied/);
    const { rows } = await as("service_role", null, () =>
      db.query<{ email: string }>(
        "select public.email_for_username('ALICE') as email",
      ),
    );
    expect(rows[0]?.email).toBe("alice@example.com");
    const avail = await as("anon", null, () =>
      db.query<{ ok: boolean }>(
        "select public.username_available('alice') as ok",
      ),
    );
    expect(avail.rows[0]?.ok).toBe(false);
  });

  it("lets users manage only their own avatar folder", async () => {
    await as("authenticated", ALICE, () =>
      db.query(
        "insert into storage.objects (bucket_id, name) values ('avatars', $1)",
        [`${ALICE}/me.jpg`],
      ),
    );
    await expect(
      as("authenticated", BOB, () =>
        db.query(
          "insert into storage.objects (bucket_id, name) values ('avatars', $1)",
          [`${ALICE}/evil.jpg`],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("removes all of a user's data when the auth user is deleted", async () => {
    await db.query("delete from auth.users where id = $1", [ALICE]);
    const left = await db.query<{ n: number }>(
      `select (select count(*) from public.profiles where id = $1)
            + (select count(*) from public.accounts where user_id = $1) as n`,
      [ALICE],
    );
    expect(Number(left.rows[0]?.n)).toBe(0);
  });
});
