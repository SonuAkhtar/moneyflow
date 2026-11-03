import { expect, test, type Page } from "@playwright/test";
import { SAMPLE_TXNS, resetMock, signInSeeded } from "./helpers";

test.beforeEach(resetMock);

const ROUTES = [
  "/",
  "/transactions",
  "/savings",
  "/analytics",
  "/emi",
  "/profile",
];

const overflowing = (page: Page) =>
  page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out: string[] = [];
    if (document.documentElement.scrollWidth > vw)
      out.push("page scrolls sideways");
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") continue;
      let clip: Element | null = el.parentElement;
      let rail = false;
      while (clip && clip !== document.body) {
        const cs = getComputedStyle(clip);
        if (cs.scrollSnapType.includes("x")) rail = true;
        if (cs.overflowX !== "visible") break;
        clip = clip.parentElement;
      }
      if (rail) continue;
      const right =
        clip && clip !== document.body
          ? clip.getBoundingClientRect().right
          : vw;
      if (r.right > right + 1 && r.right > 0) {
        out.push(
          `${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 24)}" ends at ${Math.round(r.right)} > ${Math.round(right)}`,
        );
      }
    }
    return out.slice(0, 5);
  });

const smallFields = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("input, select, textarea")]
      .filter((el) => {
        if (
          ["hidden", "file", "checkbox", "radio"].includes(
            (el as HTMLInputElement).type,
          )
        )
          return false;
        return (
          el.getBoundingClientRect().width > 0 &&
          parseFloat(getComputedStyle(el).fontSize) < 16
        );
      })
      .map(
        (el) =>
          `${el.getAttribute("aria-label") ?? (el as HTMLInputElement).labels?.[0]?.textContent ?? el.tagName} (${getComputedStyle(el).fontSize})`,
      ),
  );

const SHEETS: [string, string, (p: Page) => Promise<void>][] = [
  [
    "add expense",
    "/",
    (p) => p.getByRole("button", { name: "Add daily expense" }).click(),
  ],
  [
    "transaction filters",
    "/transactions",
    (p) => p.getByRole("button", { name: "Filters" }).click(),
  ],
  [
    "transfer",
    "/savings",
    (p) => p.getByRole("button", { name: "Transfer money" }).click(),
  ],
  [
    "add loan",
    "/emi",
    (p) => p.getByRole("button", { name: /No loan EMIs yet/ }).click(),
  ],
  [
    "add borrowing",
    "/emi",
    (p) => p.getByRole("button", { name: /No borrowings yet/ }).click(),
  ],
  [
    "edit profile",
    "/profile",
    (p) => p.getByRole("button", { name: "Edit profile" }).click(),
  ],
];

test("nothing overflows on narrow and wide phones @mobile", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signInSeeded(page, { transactions: SAMPLE_TXNS });
  for (const width of [320, 360, 412]) {
    await page.setViewportSize({ width, height: 780 });
    for (const path of ROUTES) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(300);
      expect(await overflowing(page), `${path} at ${width}px`).toEqual([]);
    }
    for (const [name, path, open] of SHEETS) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await open(page);
      await page
        .locator('[role="dialog"], #transaction-filters')
        .first()
        .waitFor();
      await page.waitForTimeout(400);
      expect(await overflowing(page), `${name} sheet at ${width}px`).toEqual(
        [],
      );
    }
  }
});

test("form fields are 16px or larger so iPhones don't zoom in @mobile", async ({
  page,
}) => {
  await signInSeeded(page, { transactions: SAMPLE_TXNS });
  for (const path of ["/transactions", "/analytics"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect(await smallFields(page), path).toEqual([]);
  }
  for (const [name, path, open] of SHEETS) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await open(page);
    await page
      .locator('[role="dialog"], #transaction-filters')
      .first()
      .waitFor();
    await page.waitForTimeout(300);
    expect(await smallFields(page), name).toEqual([]);
  }
});
