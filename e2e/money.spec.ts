import { expect, test } from "@playwright/test";
import path from "node:path";
import {
  HDFC,
  MOCK,
  SBI,
  resetMock,
  serverBalance,
  serverState,
  signInSeeded,
} from "./helpers";

test.beforeEach(resetMock);

const spentOnHome = (page: import("@playwright/test").Page) =>
  page
    .getByText("Spent", { exact: true })
    .locator("xpath=following-sibling::*[1]");

test("adding a daily expense updates balances on screen and on the server @mobile", async ({
  page,
}) => {
  await signInSeeded(page);
  await page.getByRole("button", { name: "Add daily expense" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Amount").fill("250");
  await sheet.getByLabel("Bank").selectOption(HDFC);
  await sheet.getByRole("button", { name: "Add expense" }).click();

  await expect(spentOnHome(page)).toHaveText("₹250");
  await expect.poll(() => serverBalance(HDFC)).toBe(49750);
  const { db } = await serverState();
  expect(db.transactions).toHaveLength(1);
  expect(Number(db.transactions![0]!.amount)).toBe(250);

  await page.goto("/savings");
  await expect(page.getByRole("button", { name: "Edit HDFC" })).toContainText(
    "₹49,750",
  );
});

test("bank transfer moves money and is not counted as spending", async ({
  page,
}) => {
  await signInSeeded(page);
  await page.goto("/savings");
  await page.getByRole("button", { name: "Transfer money" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("From").selectOption(HDFC);
  await sheet.getByLabel("To").selectOption(SBI);
  await sheet.getByLabel("Amount").fill("60000");
  await expect(sheet.getByRole("alert")).toContainText(
    "more than the available balance",
  );
  await sheet.getByLabel("Amount").fill("15000");
  await sheet.getByRole("button", { name: "Transfer ₹15,000" }).click();

  await expect(page.getByRole("button", { name: "Edit HDFC" })).toContainText(
    "₹35,000",
  );
  await expect(page.getByRole("button", { name: "Edit SBI" })).toContainText(
    "₹23,000",
  );
  await expect(
    page.getByRole("button", { name: "Edit transfer from HDFC to SBI" }),
  ).toBeVisible();
  await expect.poll(() => serverBalance(HDFC)).toBe(35000);
  await expect.poll(() => serverBalance(SBI)).toBe(23000);

  await page.goto("/");
  await expect(spentOnHome(page)).toHaveText("₹0");
});

test("credit card spending adds to what is owed; paying the bill is a transfer", async ({
  page,
}) => {
  await signInSeeded(page);
  await page.goto("/savings");
  await page.getByRole("button", { name: "Add wallet, cash or card" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("button", { name: "Credit card" }).click();
  await sheet.getByLabel("Name").fill("HDFC Millennia");
  await sheet.getByLabel(/Amount owed right now/).fill("0");
  await sheet.getByRole("button", { name: "Add credit card" }).click();
  await expect(
    page.getByRole("button", { name: "Edit HDFC Millennia" }),
  ).toContainText("No dues");

  await expect
    .poll(async () => (await serverState()).db.accounts!.length)
    .toBe(3);
  const card = (await serverState()).db.accounts!.find(
    (a) => a.type === "card",
  )!;

  await page.goto("/");
  await page.getByRole("button", { name: "Add daily expense" }).click();
  const expense = page.getByRole("dialog");
  await expense.getByLabel("Amount").fill("1200");
  await expense.getByLabel("Bank").selectOption(String(card.id));
  await expense.getByRole("button", { name: "Add expense" }).click();
  await expect(spentOnHome(page)).toHaveText("₹1,200");

  await page.goto("/savings");
  await expect(
    page.getByRole("button", { name: "Edit HDFC Millennia" }),
  ).toContainText("₹1,200 due");
  await expect.poll(() => serverBalance(String(card.id))).toBe(-1200);

  await page.getByRole("button", { name: "Transfer money" }).click();
  const transfer = page.getByRole("dialog");
  await transfer.getByLabel("From").selectOption(HDFC);
  await transfer.getByLabel("To").selectOption(String(card.id));
  await transfer.getByLabel("Amount").fill("1200");
  await transfer.getByRole("button", { name: "Transfer ₹1,200" }).click();
  await expect(
    page.getByRole("button", { name: "Edit HDFC Millennia" }),
  ).toContainText("No dues");
  await expect.poll(() => serverBalance(String(card.id))).toBe(0);
  await page.goto("/");
  await expect(spentOnHome(page)).toHaveText("₹1,200");
});

test("budgets are saved to the account, not just this device", async ({
  page,
}) => {
  await signInSeeded(page);
  await page.goto("/analytics");
  await page.getByRole("button", { name: "Categories" }).click();
  await page.getByRole("button", { name: "Set budgets" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Food").fill("5000");
  await sheet.getByRole("button", { name: "Save budgets" }).click();
  await expect
    .poll(async () => (await serverState()).users[0]!.user_metadata.budgets)
    .toEqual({ food: 5000 });
});

test("a loan closed by its last payment stays reachable", async ({ page }) => {
  await signInSeeded(page);
  await page.goto("/emi");
  await page.getByRole("button", { name: /No loan EMIs yet/ }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel(/Monthly amount/).fill("1000");
  await sheet.getByLabel("Tenure (months)").fill("2");
  await sheet.getByPlaceholder("Number of months").fill("1");
  await sheet.getByRole("button", { name: "Add", exact: true }).click();

  await page.getByRole("button", { name: "Show payments" }).click();
  await page.getByRole("button", { name: "Add payment to this Loan" }).click();
  const pay = page.getByRole("dialog");
  await pay.getByLabel("Amount").fill("1000");
  await pay.getByLabel("Pay from bank").selectOption(HDFC);
  await pay.getByRole("button", { name: "Add", exact: true }).click();

  await page.getByRole("button", { name: "Show closed (1)" }).click();
  await expect(page.getByText("Closed", { exact: true })).toBeVisible();
  await expect
    .poll(async () => (await serverState()).db.emis![0]!.status)
    .toBe("closed");
  await expect.poll(() => serverBalance(HDFC)).toBe(49000);
});

test("older history loads on demand", async ({ page }) => {
  const old = new Date();
  old.setMonth(old.getMonth() - 20, 15);
  old.setHours(12, 0, 0, 0);
  const user = await signInSeeded(page);
  await page.request.post(`${MOCK}/rest/v1/transactions`, {
    headers: {
      authorization: "Bearer e2e-service",
      "content-type": "application/json",
    },
    data: {
      id: "bbbbbbbb-0000-4000-8000-000000000001",
      user_id: user.id,
      account_id: HDFC,
      type: "expense",
      amount: 777,
      category: "travel",
      merchant: "Old trip",
      is_big_expense: false,
      occurred_at: old.toISOString(),
    },
  });
  await page.goto("/analytics");
  const key = `${old.getFullYear()}-${String(old.getMonth() + 1).padStart(2, "0")}`;
  await page.getByLabel("Select month").selectOption(key);
  await expect(page.getByText("Old trip").first()).toBeVisible();
});

test("profile photo is uploaded to storage", async ({ page }) => {
  const user = await signInSeeded(page);
  await page.goto("/profile");
  await page.getByRole("button", { name: "Edit profile" }).click();
  await page
    .locator('input[type="file"]')
    .setInputFiles(
      path.join(process.cwd(), "public", "icons", "favicon-64.png"),
    );
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect
    .poll(async () =>
      (await serverState()).objects.some((o) =>
        o.startsWith(`avatars/${user.id}/`),
      ),
    )
    .toBe(true);
  const profile = (await serverState()).db.profiles![0]!;
  expect(String(profile.avatar_url)).toContain(
    `${MOCK}/storage/v1/object/public/avatars/${user.id}/`,
  );
});

test("deleting the account removes the user and all data", async ({ page }) => {
  await signInSeeded(page);
  await page.goto("/profile");
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  const sheet = page.getByRole("dialog");
  const confirm = sheet.getByRole("button", { name: "Delete my account" });
  await expect(confirm).toBeDisabled();
  await sheet.getByLabel("Type DELETE to confirm").fill("DELETE");
  await confirm.click();
  await expect(page).toHaveURL(/\/login$/);
  const { db, users } = await serverState();
  expect(users).toHaveLength(0);
  expect(db.accounts).toHaveLength(0);
  expect(db.profiles).toHaveLength(0);
});
