import { expect, type Page } from "@playwright/test";

export const MOCK = "http://127.0.0.1:54399";

export interface SeedOptions {
  email?: string;
  password?: string;
  username?: string;
  fullName?: string;
  accounts?: Record<string, unknown>[];
  transactions?: Record<string, unknown>[];
  emis?: Record<string, unknown>[];
  emiPayments?: Record<string, unknown>[];
  borrowings?: Record<string, unknown>[];
  borrowingPayments?: Record<string, unknown>[];
  onboarded?: boolean;
}

export const resetMock = async () => {
  await fetch(`${MOCK}/__reset`, { method: "POST" });
};

export const seedUser = async (opts: SeedOptions = {}) => {
  const email = opts.email ?? "riya@example.com";
  const password = opts.password ?? "Passw0rd!";
  const res = await fetch(`${MOCK}/__seed`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      user: {
        email,
        password,
        data: {
          username: opts.username ?? "riya",
          full_name: opts.fullName ?? "Riya Shah",
        },
      },
      profile: {
        onboarding_complete: opts.onboarded ?? true,
        full_name: opts.fullName ?? "Riya Shah",
      },
      rows: {
        accounts: opts.accounts ?? [
          {
            id: "aaaaaaaa-0000-4000-8000-000000000001",
            name: "HDFC",
            type: "savings",
            balance: 50000,
            is_primary: true,
            color_tag: "#3d8bff",
          },
          {
            id: "aaaaaaaa-0000-4000-8000-000000000002",
            name: "SBI",
            type: "savings",
            balance: 8000,
            color_tag: "#9b8cff",
          },
        ],
        transactions: (opts.transactions ?? []).map((t) => ({
          id: crypto.randomUUID(),
          ...t,
        })),
        emis: (opts.emis ?? []).map((e) => ({
          id: crypto.randomUUID(),
          kind: "loan",
          start_month: new Date().toISOString().slice(0, 7),
          remaining_months: 12,
          total_months: 12,
          paid_months: 0,
          account_id: null,
          ...e,
        })),
        emi_payments: (opts.emiPayments ?? []).map((p) => ({
          id: crypto.randomUUID(),
          account_id: null,
          ...p,
        })),
        borrowings: (opts.borrowings ?? []).map((b) => ({
          id: crypto.randomUUID(),
          ...b,
        })),
        borrowing_payments: (opts.borrowingPayments ?? []).map((p) => ({
          id: crypto.randomUUID(),
          ...p,
        })),
      },
    }),
  });
  const { id } = (await res.json()) as { id: string };
  return { id, email, password };
};

export const serverState = async () =>
  (await (await fetch(`${MOCK}/__state`)).json()) as {
    db: Record<string, Record<string, unknown>[]>;
    users: {
      id: string;
      email: string;
      user_metadata: Record<string, unknown>;
    }[];
    objects: string[];
  };

export const serverBalance = async (id: string) =>
  Number((await serverState()).db.accounts!.find((a) => a.id === id)?.balance);

export const signIn = async (
  page: Page,
  identifier: string,
  password: string,
) => {
  await page.goto("/login");
  await page.getByLabel("Email or username").fill(identifier);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
};

export const showAmounts = async (page: Page) => {
  await page.getByRole("button", { name: "Show monthly amounts" }).click();
};

export const signInSeeded = async (page: Page, opts: SeedOptions = {}) => {
  const user = await seedUser(opts);
  await signIn(page, user.email, user.password);
  await expect(
    page.getByRole("region", { name: "Monthly statement" }),
  ).toBeVisible();
  await showAmounts(page);
  return user;
};

export const HDFC = "aaaaaaaa-0000-4000-8000-000000000001";
export const SBI = "aaaaaaaa-0000-4000-8000-000000000002";

export const day = (offset: number) => {
  const d = new Date();
  d.setDate(Math.max(1, d.getDate() - offset));
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
};
const lastMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  d.setDate(10);
  return d.toISOString();
};

export const SAMPLE_TXNS = [
  {
    account_id: HDFC,
    type: "income",
    amount: 85000,
    category: "salary",
    note: "Salary",
    occurred_at: day(0),
  },
  {
    account_id: HDFC,
    type: "expense",
    amount: 12000,
    category: "shopping",
    merchant: "Croma",
    is_big_expense: true,
    occurred_at: day(3),
  },
  {
    account_id: HDFC,
    type: "expense",
    amount: 30000,
    category: "travel",
    merchant: "IndiGo",
    is_big_expense: true,
    occurred_at: day(1),
  },
  {
    account_id: SBI,
    type: "expense",
    amount: 4500,
    category: "health",
    merchant: "Apollo",
    is_big_expense: true,
    occurred_at: day(2),
  },
  {
    account_id: HDFC,
    type: "expense",
    amount: 250,
    category: "food",
    merchant: "Swiggy",
    occurred_at: day(0),
  },
  {
    account_id: HDFC,
    type: "expense",
    amount: 120,
    category: "transport",
    merchant: "Uber",
    occurred_at: day(1),
  },
  {
    account_id: SBI,
    type: "expense",
    amount: 900,
    category: "groceries",
    merchant: "BigBasket",
    occurred_at: day(2),
  },
  {
    account_id: HDFC,
    type: "expense",
    amount: 2000,
    category: "food",
    merchant: "Dominos",
    occurred_at: lastMonth(),
  },
];
