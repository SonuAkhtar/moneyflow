import { expect, test } from "@playwright/test";
import path from "node:path";
import {
  HDFC,
  MOCK,
  SAMPLE_TXNS,
  SBI,
  resetMock,
  serverState,
  signInSeeded,
} from "./helpers";

test.beforeEach(resetMock);

const iso = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

test("an expired email link explains itself on the sign-in page", async ({
  page,
}) => {
  await page.goto("/login?error=link_expired");
  await expect(
    page.getByRole("alert").filter({ hasText: "That link has expired" }),
  ).toBeVisible();
});

test("taking money out of a bank can't go below zero", async ({ page }) => {
  await signInSeeded(page);
  await page.getByRole("button", { name: /Show bank savings/ }).click();
  await page.getByRole("button", { name: /SBI/ }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("button", { name: /Take money/ }).click();
  await expect(
    sheet.getByRole("button", { name: /Take money/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await sheet.getByLabel("Amount").fill("9000");
  await expect(sheet.getByRole("alert")).toContainText("more than");
  await expect(sheet.getByRole("button", { name: /^Take ₹/ })).toBeDisabled();
  await sheet.getByLabel("Amount").fill("8000");
  await expect(sheet.getByRole("button", { name: /^Take ₹/ })).toBeEnabled();
  expect(
    Number(
      (await serverState()).db.accounts!.find((a) => a.id === SBI)!.balance,
    ),
  ).toBe(8000);
});

test("removing a salary asks first and can be undone", async ({ page }) => {
  await signInSeeded(page, { transactions: SAMPLE_TXNS });
  await page.goto("/profile");
  await page.getByRole("button", { name: /Monthly salary/ }).click();
  const month = new Date().toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
  await page.getByRole("button", { name: new RegExp(`^${month}`) }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.getByText("Remove this salary?")).toBeVisible();
  await page.getByRole("button", { name: "Remove", exact: true }).click();

  const toast = page.getByRole("status").filter({ hasText: "Salary removed" });
  await expect
    .poll(async () =>
      (await serverState()).db.transactions!.some(
        (t) => t.category === "salary",
      ),
    )
    .toBe(false);
  await toast.getByRole("button", { name: "Undo" }).click();
  await expect
    .poll(async () =>
      (await serverState()).db.transactions!.some(
        (t) => t.category === "salary",
      ),
    )
    .toBe(true);
});

test("a repayment can't be edited above what is owed, or dated in the future", async ({
  page,
}) => {
  const id = crypto.randomUUID();
  await signInSeeded(page, {
    borrowings: [
      {
        id,
        lender: "Rahul",
        amount: 1000,
        borrowed_on: iso(-30),
        due_date: null,
      },
    ],
    borrowingPayments: [{ borrowing_id: id, paid_on: iso(-5), amount: 800 }],
  });
  await page.goto("/emi");
  await page.getByRole("button", { name: "Show payments for Rahul" }).click();
  await page.getByRole("button", { name: /₹800/ }).click();
  const sheet = page.getByRole("dialog");
  const save = sheet.getByRole("button", { name: "Save changes" });

  await sheet.getByLabel("Amount").fill("5000");
  await expect(sheet.getByRole("alert")).toContainText("₹1,000 still owed");
  await expect(save).toBeDisabled();

  await sheet.getByLabel("Amount").fill("1000");
  await expect(save).toBeEnabled();
  await sheet.getByLabel("Paid on").fill(iso(5));
  await expect(sheet.getByText("Pick today or an earlier date")).toBeVisible();
  await expect(save).toBeDisabled();
});

test("a failed photo upload keeps the old photo and says so", async ({
  page,
}) => {
  await signInSeeded(page);
  await fetch(`${MOCK}/__fail`, {
    method: "POST",
    body: JSON.stringify({
      method: "POST",
      path: "/storage/v1/object/avatars",
      status: 400,
    }),
  });
  await page.goto("/profile");
  await page.getByRole("button", { name: "Edit profile" }).click();
  await page
    .locator('input[type="file"]')
    .setInputFiles(
      path.join(process.cwd(), "public", "icons", "favicon-64.png"),
    );
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Couldn't upload photo")).toBeVisible();
  await page.waitForTimeout(500);
  expect((await serverState()).db.profiles![0]!.avatar_url).toBeNull();
});

test("a month's transfer total counts every transfer, not just those shown", async ({
  page,
}) => {
  const at = new Date();
  at.setHours(12, 0, 0, 0);
  const transfers = Array.from({ length: 8 }, (_, i) => {
    const when = new Date(at.getTime() - i * 60_000).toISOString();
    return [
      {
        account_id: HDFC,
        type: "transfer",
        amount: 1000,
        category: "other",
        note: "Bank transfer out",
        merchant: "To SBI",
        occurred_at: when,
      },
      {
        account_id: SBI,
        type: "transfer",
        amount: 1000,
        category: "other",
        note: "Bank transfer in",
        merchant: "From HDFC",
        occurred_at: when,
      },
    ];
  }).flat();
  await signInSeeded(page, { transactions: transfers });
  await page.goto("/savings");
  await expect(
    page.getByRole("button", { name: /Edit transfer from HDFC to SBI/ }),
  ).toHaveCount(5);
  await expect(page.locator('[class*="tgroup_head"]').first()).toContainText(
    "₹8,000",
  );
});
