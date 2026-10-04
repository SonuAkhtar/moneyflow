import { expect, type Page } from "@playwright/test";

export const MOCK = "http://127.0.0.1:54399";

export interface SeedOptions {
  email?: string;
  password?: string;
  username?: string;
  fullName?: string;
  accounts?: Record<string, unknown>[];
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

export const signInSeeded = async (page: Page, opts: SeedOptions = {}) => {
  const user = await seedUser(opts);
  await signIn(page, user.email, user.password);
  await expect(page.getByText("Monthly statement")).toBeVisible();
  return user;
};

export const HDFC = "aaaaaaaa-0000-4000-8000-000000000001";
export const SBI = "aaaaaaaa-0000-4000-8000-000000000002";
