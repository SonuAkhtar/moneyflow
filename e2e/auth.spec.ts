import { expect, test } from "@playwright/test";
import { resetMock, seedUser, serverState, signIn } from "./helpers";

test.beforeEach(resetMock);

test("sign up, skip onboarding without fake data, land on home", async ({
  page,
}) => {
  await page.goto("/signup");
  await page.getByLabel("Full name").fill("Arjun Mehta");
  await page.getByLabel("Username").fill("arjun");
  await page.getByLabel("Email").fill("arjun@example.com");
  await page.getByLabel("Password", { exact: true }).fill("Passw0rd!");
  await page.getByLabel("Confirm password").fill("Passw0rd!");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(
    page.getByRole("heading", { name: "Welcome to moneyFlow" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Skip personalization" }).click();
  await expect(page.getByText("Monthly statement")).toBeVisible();

  const { db } = await serverState();
  expect(db.accounts).toHaveLength(1);
  expect(Number(db.accounts![0]!.balance)).toBe(0);
  expect(db.profiles![0]!.monthly_salary).toBe(0);
  expect(db.profiles![0]!.onboarding_complete).toBe(true);

  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/$/);
});

test("sign in with username goes through the server route", async ({
  page,
}) => {
  await seedUser({ username: "riya" });
  const calls: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/rpc/email_for_username")) calls.push(r.url());
  });
  await signIn(page, "riya", "Passw0rd!");
  await expect(page.getByText("Monthly statement")).toBeVisible();
  expect(calls).toEqual([]);
});

test("unknown username and wrong password show the same error", async ({
  page,
}) => {
  await seedUser({ username: "riya" });
  await signIn(page, "nobody", "Passw0rd!");
  const unknown = await page.locator("form").getByRole("alert").textContent();
  await signIn(page, "riya", "wrong-pass");
  const wrong = await page.locator("form").getByRole("alert").textContent();
  expect(unknown).toBe("Invalid username or password");
  expect(wrong).toBe(unknown);
});

test("sign in with email and sign out @mobile", async ({ page }) => {
  const user = await seedUser();
  await signIn(page, user.email, user.password);
  await expect(page.getByText("Monthly statement")).toBeVisible();
  await page.goto("/profile");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
});
