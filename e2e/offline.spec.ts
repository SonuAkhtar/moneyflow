import { expect, test } from "@playwright/test";
import {
  HDFC,
  resetMock,
  serverBalance,
  serverState,
  signInSeeded,
} from "./helpers";

test.beforeEach(resetMock);

test("changes made offline are kept and synced when back online @mobile", async ({
  page,
  context,
}) => {
  await signInSeeded(page);
  await context.setOffline(true);

  await page.getByRole("button", { name: "Add daily expense" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Amount").fill("20");
  await sheet.getByLabel("Bank").selectOption(HDFC);
  await sheet.getByRole("button", { name: "Add expense" }).click();

  const badge = page.getByRole("button", { name: /1 change waiting to sync/ });
  await expect(badge).toBeVisible();
  expect((await serverState()).db.transactions).toHaveLength(0);
  const stored = await page.evaluate(() => localStorage.getItem("mf-outbox"));
  expect(stored).toContain('"txn.save"');

  await context.setOffline(false);
  await expect(badge).toBeHidden();
  await expect
    .poll(async () => (await serverState()).db.transactions!.length)
    .toBe(1);
  await expect.poll(() => serverBalance(HDFC)).toBe(49980);
  expect(
    await page.evaluate(() => localStorage.getItem("mf-outbox")),
  ).toBeNull();
});

test("queued changes survive a reload and sync afterwards", async ({
  page,
  context,
}) => {
  await signInSeeded(page);
  await context.setOffline(true);
  await page.getByRole("button", { name: "Add daily expense" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Amount").fill("35");
  await sheet.getByLabel("Bank").selectOption(HDFC);
  await sheet.getByRole("button", { name: "Add expense" }).click();
  await expect(
    page.getByRole("button", { name: /waiting to sync/ }),
  ).toBeVisible();

  await page.route("**/rest/v1/transactions*", (route) =>
    route.abort("internetdisconnected"),
  );
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByText("Monthly statement")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /waiting to sync/ }),
  ).toBeVisible();

  await page.unroute("**/rest/v1/transactions*");
  await page.getByRole("button", { name: /waiting to sync/ }).click();
  await expect
    .poll(async () => (await serverState()).db.transactions!.length)
    .toBe(1);
  await expect.poll(() => serverBalance(HDFC)).toBe(49965);
});
