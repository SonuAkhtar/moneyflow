import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { resetMock, signInSeeded } from "./helpers";

test.beforeEach(resetMock);

const scan = async (page: import("@playwright/test").Page) => {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((v) => ["serious", "critical"].includes(v.impact ?? ""))
    .map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
    );
};

test("signed-in pages have no serious accessibility violations @mobile", async ({
  page,
}) => {
  await signInSeeded(page);
  for (const path of ["/", "/savings", "/analytics", "/emi", "/profile"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);
    expect(await scan(page), path).toEqual([]);
  }
});

test("dialogs are accessible", async ({ page }) => {
  await signInSeeded(page);
  await page.goto("/savings");
  await page.getByRole("button", { name: "Transfer money" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.waitForTimeout(400);
  expect(await scan(page)).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});
