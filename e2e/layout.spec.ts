import { expect, test } from "@playwright/test";
import { resetMock, signInSeeded } from "./helpers";

test.beforeEach(resetMock);

test("no page scrolls sideways on a small phone @mobile", async ({ page }) => {
  await signInSeeded(page);
  for (const path of ["/", "/savings", "/analytics", "/emi", "/profile"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
