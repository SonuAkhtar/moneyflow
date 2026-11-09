import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import {
  accountToRow,
  borrowingPaymentToRow,
  borrowingToRow,
  emiPaymentToRow,
  emiToRow,
  transactionToRow,
} from "../../src/lib/supabase/mappers";

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
create table storage.buckets (
  id text primary key,
  name text,
  public boolean,
  file_size_limit bigint,
  allowed_mime_types text[]
);
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

  it("only lets users edit their own app settings, never email or username", async () => {
    await as("authenticated", BOB, () =>
      db.query("update public.profiles set full_name = 'Bobby' where id = $1", [
        BOB,
      ]),
    );
    await expect(
      as("authenticated", BOB, () =>
        db.query("update public.profiles set email = 'alice@example.com'"),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      as("authenticated", BOB, () =>
        db.query("update public.profiles set username = 'alice'"),
      ),
    ).rejects.toThrow(/permission denied/);
    await db.query(
      "update auth.users set email = 'bob2@example.com' where id = $1",
      [BOB],
    );
    const { rows } = await db.query<{ email: string; full_name: string }>(
      "select email, full_name from public.profiles where id = $1",
      [BOB],
    );
    expect(rows[0]).toEqual({ email: "bob2@example.com", full_name: "Bobby" });
  });

  it("rejects links to another user's account", async () => {
    const alicesAccount = "aaaaaaaa-0000-0000-0000-000000000001";
    await expect(
      as("authenticated", BOB, () =>
        db.query(
          "update public.profiles set major_account_id = $1 where id = $2",
          [alicesAccount, BOB],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as("authenticated", BOB, () =>
        db.query(
          "insert into public.emis (user_id, account_id, name) values ($1, $2, 'x')",
          [BOB, alicesAccount],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
    await as("authenticated", BOB, () =>
      db.query(
        "insert into public.emis (id, user_id, name) values ('bbbbbbbb-0000-0000-0000-000000000001', $1, 'Car')",
        [BOB],
      ),
    );
    await expect(
      as("authenticated", BOB, () =>
        db.query(
          `insert into public.emi_payments (emi_id, user_id, account_id, month)
           values ('bbbbbbbb-0000-0000-0000-000000000001', $1, $2, '2026-01')`,
          [BOB, alicesAccount],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("enforces data checks and one payment per EMI month", async () => {
    const emi = "bbbbbbbb-0000-0000-0000-000000000001";
    await expect(
      as("authenticated", BOB, () =>
        db.query(
          "insert into public.emis (user_id, name, monthly_amount) values ($1, 'x', -1)",
          [BOB],
        ),
      ),
    ).rejects.toThrow(/check constraint/);
    await expect(
      as("authenticated", BOB, () =>
        db.query(
          "insert into public.emi_payments (emi_id, user_id, month) values ($1, $2, '2026-1')",
          [emi, BOB],
        ),
      ),
    ).rejects.toThrow(/check constraint/);
    await as("authenticated", BOB, () =>
      db.query(
        "insert into public.emi_payments (emi_id, user_id, month) values ($1, $2, '2026-02')",
        [emi, BOB],
      ),
    );
    await expect(
      as("authenticated", BOB, () =>
        db.query(
          "insert into public.emi_payments (emi_id, user_id, month) values ($1, $2, '2026-02')",
          [emi, BOB],
        ),
      ),
    ).rejects.toThrow(/duplicate key/);
    await as("authenticated", BOB, () =>
      db.query(
        "insert into public.emi_payments (emi_id, user_id, month, kind) values ($1, $2, '2026-02', 'extra')",
        [emi, BOB],
      ),
    );
    await expect(
      as("authenticated", BOB, () =>
        db.query(
          "insert into public.emi_payments (emi_id, user_id, month, kind) values ($1, $2, '2026-02', 'other')",
          [emi, BOB],
        ),
      ),
    ).rejects.toThrow(/check constraint/);
    await expect(
      db.query(
        `insert into auth.users (id, raw_user_meta_data)
         values ('33333333-3333-3333-3333-333333333333', '{"username":"no spaces"}')`,
      ),
    ).rejects.toThrow(/check constraint/);
  });

  it("stores EMI amount changes as a JSON array", async () => {
    const { rows } = await as("authenticated", BOB, () =>
      db.query<{ amount_changes: unknown }>(
        "insert into public.emis (user_id, name) values ($1, 'plain') returning amount_changes",
        [BOB],
      ),
    );
    expect(rows[0]!.amount_changes).toEqual([]);
    await as("authenticated", BOB, () =>
      db.query(
        `insert into public.emis (user_id, name, amount_changes)
         values ($1, 'stepped', '[{"from":"2027-01","amount":1200}]')`,
        [BOB],
      ),
    );
    await expect(
      as("authenticated", BOB, () =>
        db.query(
          `insert into public.emis (user_id, name, amount_changes) values ($1, 'x', '{}')`,
          [BOB],
        ),
      ),
    ).rejects.toThrow(/check constraint/);
  });

  it("applies each balance op exactly once", async () => {
    const acct = "aaaaaaaa-0000-0000-0000-000000000001";
    const op = "cccccccc-0000-0000-0000-000000000001";
    const adjust = (uid: string, delta: number, opId: string) =>
      as("authenticated", uid, () =>
        db.query<{ balance: string | null }>(
          "select public.adjust_balance($1, $2, $3) as balance",
          [acct, delta, opId],
        ),
      );
    const before = Number(
      (
        await db.query<{ balance: string }>(
          "select balance from public.accounts where id = $1",
          [acct],
        )
      ).rows[0]!.balance,
    );
    const first = await adjust(ALICE, -100.25, op);
    const replay = await adjust(ALICE, -100.25, op);
    expect(Number(first.rows[0]!.balance)).toBe(before - 100.25);
    expect(Number(replay.rows[0]!.balance)).toBe(before - 100.25);

    const stranger = await adjust(
      BOB,
      1000,
      "cccccccc-0000-0000-0000-000000000002",
    );
    expect(stranger.rows[0]!.balance).toBeNull();
    const ledger = await as("authenticated", BOB, () =>
      db.query("select op_id from public.balance_ops"),
    );
    expect(ledger.rows).toHaveLength(0);
    await expect(
      as("authenticated", BOB, () =>
        db.query(
          "insert into public.balance_ops (op_id, user_id, account_id) values (gen_random_uuid(), $1, $2)",
          [BOB, acct],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as("authenticated", ALICE, () =>
        db.query("delete from public.balance_ops"),
      ),
    ).rejects.toThrow(/permission denied/);
    const after = await db.query<{ balance: string }>(
      "select balance from public.accounts where id = $1",
      [acct],
    );
    expect(Number(after.rows[0]!.balance)).toBe(before - 100.25);
  });

  it("rate limits through a service-role-only function", async () => {
    const hit = () =>
      as("service_role", null, () =>
        db.query<{ wait: number }>(
          "select public.hit_rate_limit('test:k', 2, 60) as wait",
        ),
      );
    const waits = [];
    for (let i = 0; i < 3; i += 1) waits.push((await hit()).rows[0]!.wait);
    expect(waits.slice(0, 2)).toEqual([0, 0]);
    expect(waits[2]).toBeGreaterThan(0);
    await expect(
      as("authenticated", BOB, () =>
        db.query("select public.hit_rate_limit('test:k', 2, 60)"),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      as("authenticated", BOB, () =>
        db.query("select * from public.rate_limits"),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("keeps avatars private to their owner and limits uploads", async () => {
    const seen = await as("authenticated", BOB, () =>
      db.query("select name from storage.objects where bucket_id = 'avatars'"),
    );
    expect(seen.rows).toHaveLength(0);
    const { rows } = await db.query<{ file_size_limit: string }>(
      "select file_size_limit from storage.buckets where id = 'avatars'",
    );
    expect(Number(rows[0]!.file_size_limit)).toBe(2 * 1024 * 1024);
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

describe("app and schema stay in sync", () => {
  it("every column the app writes exists after all migrations", async () => {
    const any = {} as never;
    const written: Record<string, string[]> = {
      accounts: Object.keys(accountToRow(any)),
      transactions: Object.keys(transactionToRow(any)),
      emis: Object.keys(emiToRow(any)),
      emi_payments: Object.keys(emiPaymentToRow(any, "", "")),
      borrowings: Object.keys(borrowingToRow(any)),
      borrowing_payments: Object.keys(borrowingPaymentToRow(any, "", "")),
    };
    for (const [table, columns] of Object.entries(written)) {
      const { rows } = await db.query<{ column_name: string }>(
        "select column_name from information_schema.columns where table_schema = 'public' and table_name = $1",
        [table],
      );
      const existing = new Set(rows.map((r) => r.column_name));
      expect(
        columns.filter((c) => !existing.has(c)),
        table,
      ).toEqual([]);
    }
  });
});
