import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  HDFC,
  SAMPLE_TXNS,
  resetMock,
  seedUser,
  serverBalance,
  serverState,
  showAmounts,
  signIn,
  signInSeeded,
} from "./helpers";

test.beforeEach(resetMock);

const seriousViolations = async (page: Page) => {
  await page.waitForTimeout(600);
  return (await new AxeBuilder({ page }).analyze()).violations
    .filter((v) => ["serious", "critical"].includes(v.impact ?? ""))
    .map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
    );
};

const localDateKey = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

test("the major expense sheet logs a major expense @mobile", async ({
  page,
}) => {
  await signInSeeded(page);
  await page.getByRole("button", { name: "Add major expense" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByLabel("Expense amount")).toBeFocused();
  await expect(
    sheet.getByRole("button", { name: "Add expense" }),
  ).toBeDisabled();
  await expect(sheet.getByRole("status")).toHaveCount(0);

  expect(await seriousViolations(page)).toEqual([]);
  await page.keyboard.type("12000");
  await sheet.getByLabel("Merchant (optional)").fill("Croma");
  await sheet.getByRole("button", { name: "Yesterday" }).click();
  await expect(sheet.locator('input[type="date"]')).toHaveValue(
    localDateKey(1),
  );
  await sheet.getByRole("button", { name: "Add expense" }).click();

  await expect(
    page.getByRole("status").filter({ hasText: "Major expense added" }),
  ).toBeVisible();
  await expect
    .poll(async () => (await serverState()).db.transactions?.length)
    .toBe(1);
  const saved = (await serverState()).db.transactions![0]!;
  expect(saved.is_big_expense).toBe(true);
  expect(saved.merchant).toBe("Croma");
  expect(Number(saved.amount)).toBe(12000);
  await expect.poll(() => serverBalance(HDFC)).toBe(38000);
});

test("budgets are set on the profile and shown on home and in the add sheet", async ({
  page,
}) => {
  await signInSeeded(page);
  await expect(page.getByText("Left today")).toHaveCount(0);

  await page.goto("/profile");
  await page.getByRole("button", { name: /Spending budget/ }).click();
  await page.getByLabel("Daily spends per month").fill("15000");
  await page.getByLabel("Major spends per month").fill("20000");
  await page.getByRole("button", { name: "Save budget" }).click();
  await expect
    .poll(
      async () => (await serverState()).users[0]?.user_metadata.spend_budget,
    )
    .toMatchObject({ daily: 15000, major: 20000 });

  await page.goto("/");
  await showAmounts(page);
  await expect(page.getByText("Left today")).toBeVisible();
  const majorLeft = page
    .getByText("Left this month")
    .locator("..")
    .getByText(/₹/);
  await expect(majorLeft).toHaveText("₹20,000");

  await page.getByRole("button", { name: "Add major expense" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("button", { name: "Shopping" }).click();
  await sheet.getByLabel("Expense amount").fill("200");
  await expect(sheet.getByText("Safe to spend this month")).toBeVisible();
  await expect(sheet.locator("strong", { hasText: "₹19,800" })).toBeVisible();
  await expect(sheet.getByText("₹20,000 before this")).toBeVisible();
  await sheet.getByRole("button", { name: "Add expense" }).click();

  await expect(sheet).toBeHidden();
  await expect(majorLeft).toHaveText("₹19,800");
});

test("the font picked on the profile applies to the whole app", async ({
  page,
}) => {
  await signInSeeded(page);
  await page.goto("/profile");
  await page.getByRole("button", { name: /Font/ }).click();
  await page.getByRole("radio", { name: /Syne/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-font", "syne");
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).fontFamily))
    .toContain("Syne");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-font", "syne");
});

test("monthly amounts start hidden and the eye shows them", async ({
  page,
}) => {
  await signInSeeded(page, { transactions: SAMPLE_TXNS });
  const statement = page.getByRole("region", { name: "Monthly statement" });
  await expect(statement).toContainText("₹85,000");
  await page.getByRole("button", { name: "Hide monthly amounts" }).click();
  await expect(statement).not.toContainText("₹85,000");
  await expect(statement).toContainText("₹*****");
  await expect(page.getByText("₹46,500")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Show monthly amounts" }),
  ).toBeVisible();
});

test("the add sheet explains why it cannot save without a bank", async ({
  page,
}) => {
  await signInSeeded(page, { accounts: [] });
  await page.getByRole("button", { name: "Add daily expense" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("status")).toHaveText(
    "Add a bank on the Savings tab first.",
  );
});

test("transactions screen searches, filters, pages and clears @mobile", async ({
  page,
}) => {
  await signInSeeded(page, { transactions: SAMPLE_TXNS });
  await page.getByRole("link", { name: "Search transactions" }).click();
  await expect(page).toHaveURL(/\/transactions$/);
  await expect(
    page.getByRole("status").filter({ hasText: "8 transactions" }),
  ).toBeVisible();

  const search = page.getByRole("searchbox", { name: "Search transactions" });
  await search.fill("swig");
  await expect(page.getByText("1 transaction", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Swiggy/ })).toBeVisible();

  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(search).toHaveValue("");

  await page.getByRole("button", { name: "Filters" }).click();
  await page.getByLabel("Category").selectOption("food");
  await expect(page.getByText("2 transactions", { exact: true })).toBeVisible();
  await page.getByLabel("Min amount").fill("1000");
  await expect(page.getByText("1 transaction", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Dominos/ })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Filters, 2 active" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("button", { name: "Income", exact: true }).click();
  await expect(page.getByText("1 transaction", { exact: true })).toBeVisible();

  expect(await seriousViolations(page)).toEqual([]);
});

test("transactions are grouped by month and paged instead of silently cut", async ({
  page,
}) => {
  const many = Array.from({ length: 60 }, (_, i) => ({
    account_id: HDFC,
    type: "expense",
    amount: 10 + i,
    category: "food",
    merchant: `Shop ${i}`,
    occurred_at: new Date(Date.now() - i * 3_600_000).toISOString(),
  }));
  await signInSeeded(page, { transactions: many });
  await page.goto("/transactions");
  await expect(page.getByText("Showing 50 of 60")).toBeVisible();
  await page.getByRole("button", { name: "Show 10 more" }).click();
  await expect(
    page.getByText("60 transactions", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
});

test("home 'See all' opens the transactions screen filtered to that list", async ({
  page,
}) => {
  const daily = Array.from({ length: 7 }, (_, i) => ({
    account_id: HDFC,
    type: "expense",
    amount: 100 + i,
    category: "food",
    merchant: `Cafe ${i}`,
    occurred_at: new Date(Date.now() - i * 3_600_000).toISOString(),
  }));
  const lastMonth = new Date();
  lastMonth.setDate(1);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const older = Array.from({ length: 3 }, (_, i) => ({
    account_id: HDFC,
    type: "expense",
    amount: 50 + i,
    category: "food",
    merchant: `Old ${i}`,
    occurred_at: lastMonth.toISOString(),
  }));
  await signInSeeded(page, { transactions: [...daily, ...older] });
  await page.getByRole("link", { name: "See all 7" }).click();
  await expect(page).toHaveURL(/\/transactions\?kind=daily/);
  await expect(page.getByText("7 transactions", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Filters, 2 active" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Search transactions" }).click();
  await expect(page).toHaveURL(/\/transactions$/);
  await expect(page.getByRole("button", { name: "Filters" })).toBeVisible();
  await expect(
    page.getByText("10 transactions", { exact: true }),
  ).toBeVisible();
});

test("deleting an expense can be undone from the toast", async ({ page }) => {
  await signInSeeded(page, { transactions: SAMPLE_TXNS });
  await page.goto("/transactions");
  await page.getByRole("button", { name: /Swiggy/ }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("button", { name: "Delete expense" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();

  const toast = page.getByRole("status").filter({ hasText: "Expense deleted" });
  await expect(toast).toBeVisible();
  await expect
    .poll(async () => (await serverState()).db.transactions?.length)
    .toBe(SAMPLE_TXNS.length - 1);

  await toast.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: /Swiggy/ })).toBeVisible();
  await expect
    .poll(async () => (await serverState()).db.transactions?.length)
    .toBe(SAMPLE_TXNS.length);
  await expect.poll(() => serverBalance(HDFC)).toBe(50000);
});

test("toasts announce their message and have a separate dismiss button", async ({
  page,
}) => {
  await signInSeeded(page);
  await page.getByRole("button", { name: "Add daily expense" }).click();
  await page.keyboard.type("80");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add expense" })
    .click();
  const toast = page.getByRole("status").filter({ hasText: "Expense added" });
  await expect(toast).toContainText("₹80");
  await toast.getByRole("button", { name: "Dismiss: Expense added" }).click();
  await expect(toast).toBeHidden();
});

test("home shows spending pace, budget use and health score @mobile", async ({
  page,
}) => {
  await signInSeeded(page, { transactions: SAMPLE_TXNS });
  const toggle = page.getByRole("button", { name: "Spending pace" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("img", { name: /so far this month/ }),
  ).toHaveCount(0);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("img", { name: /Spent ₹47,770 so far this month/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Financial health \d+\/100/ }),
  ).toBeVisible();

  await page.getByRole("button", { name: /Set budgets/ }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Food").fill("1000");
  await sheet.getByRole("button", { name: "Save budgets" }).click();
  await expect(
    page.getByRole("progressbar", { name: "Budget used: 25%" }),
  ).toBeVisible();
});

test("major expenses sort by amount by default and can sort by date", async ({
  page,
}) => {
  test.skip(new Date().getDate() <= 3, "needs 3 earlier days this month");
  await signInSeeded(page, { transactions: SAMPLE_TXNS });
  const major = page.locator("section", {
    has: page.getByRole("heading", { name: "Major expenses" }),
  });
  const titles = () =>
    major.locator("button").filter({ hasText: /-₹/ }).allInnerTexts();
  await expect(
    major.getByRole("button", { name: "Sort by amount" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect((await titles()).map((t) => t.split("\n")[0])).toEqual([
    "IndiGo",
    "Croma",
    "Apollo",
  ]);
  await major.getByRole("button", { name: "Sort by date" }).click();
  await expect
    .poll(async () => (await titles()).map((t) => t.split("\n")[0]))
    .toEqual(["IndiGo", "Apollo", "Croma"]);
});

test("every control on home is at least 44px to tap @mobile", async ({
  page,
}) => {
  await signInSeeded(page, { transactions: SAMPLE_TXNS });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  const small = await page.evaluate(() =>
    [
      ...document.querySelectorAll(
        "main button, main a, header button, header a, nav a, nav button",
      ),
    ]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.width < 44 || r.height < 44);
      })
      .map((el) =>
        (el.getAttribute("aria-label") || el.textContent || "").trim(),
      ),
  );
  expect(small).toEqual([]);
});

test("number fields ignore letters like 'e'", async ({ page }) => {
  await signInSeeded(page);
  await page.goto("/analytics");
  await page.getByRole("button", { name: "Categories" }).click();
  await page.getByRole("button", { name: "Set budgets" }).click();
  const food = page.getByRole("dialog").getByLabel("Food");
  await food.pressSequentially("5e3-");
  await expect(food).toHaveValue("53");
});

test("theme follows the OS setting until the user picks one", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.evaluate(() => localStorage.setItem("mf-theme", "dark"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("onboarding asks for a currency, can go back, and saves it", async ({
  page,
}) => {
  const { email, password } = await seedUser({
    onboarded: false,
    accounts: [],
  });
  await signIn(page, email, password);
  await expect(
    page.getByRole("progressbar", { name: "Setup progress" }),
  ).toHaveAttribute("aria-valuetext", "Step 1 of 4");
  await page.getByLabel("Currency").selectOption("USD");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByLabel("Monthly salary ($)")).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByLabel("Currency")).toHaveValue("USD");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Skip personalization" }).click();
  await expect(
    page.getByRole("region", { name: "Monthly statement" }),
  ).toBeVisible();
  await expect
    .poll(async () => (await serverState()).db.profiles![0]!.currency)
    .toBe("USD");
  await showAmounts(page);
  await expect(page.getByText("$0").first()).toBeVisible();
});

test("analytics trend follows the selected month", async ({ page }) => {
  await signInSeeded(page, { transactions: SAMPLE_TXNS });
  await page.goto("/analytics");
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 3);
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  await page.getByLabel("Select month").selectOption(key);
  const label = d.toLocaleString("en-US", { month: "long", year: "numeric" });
  await expect(page.getByText(`6 months to ${label}`)).toBeVisible();
});

test("upcoming payments stay in the current month with overdue and paid states @mobile", async ({
  page,
}) => {
  const today = new Date();
  test.skip(today.getDate() <= 5, "needs 5 earlier days this month");
  const day = (offset: number) =>
    Math.min(
      Math.max(1, today.getDate() + offset),
      new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate(),
    );
  const month = today.toISOString().slice(0, 7);
  const monthShort = today.toLocaleString("en-US", { month: "short" });
  const paidId = crypto.randomUUID();
  await signInSeeded(page, {
    emis: [
      { name: "Car loan", monthly_amount: 9000, due_day: day(2) },
      { name: "Home loan", monthly_amount: 20000, due_day: day(-5) },
      {
        id: paidId,
        name: "Index SIP",
        kind: "sip",
        monthly_amount: 5000,
        due_day: day(-3),
      },
    ],
    emiPayments: [
      { emi_id: paidId, month, amount: 5000, paid_on: `${month}-01` },
    ],
  });
  const rail = page.getByRole("list", { name: /Upcoming payments/ });
  const items = rail.getByRole("listitem");
  await expect(items).toHaveCount(3);
  for (const text of await items.allTextContents())
    expect(text.startsWith(monthShort) || text.includes(monthShort)).toBe(true);
  const home = items.filter({ hasText: "Home loan" });
  await expect(home).toContainText("Overdue 5d");
  await expect(home).toContainText("Loan EMI");
  const sip = items.filter({ hasText: "Index SIP" });
  await expect(sip.getByRole("img", { name: "Paid" })).toBeVisible();
  await expect(items.filter({ hasText: "Car loan" })).toContainText(
    "In 2 days",
  );
  await expect(page.getByText("₹29,000")).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
});

test("the add sheet opens at the top with the amount ready to type @mobile", async ({
  page,
}) => {
  await signInSeeded(page, { transactions: SAMPLE_TXNS });
  await page.getByRole("button", { name: "Add major expense" }).click();
  const amount = page.getByRole("dialog").getByLabel("Expense amount");
  await expect(amount).toBeFocused();
  await page.waitForTimeout(600);
  await expect(amount).toBeInViewport();
  const scrollTop = await page
    .locator('[role="dialog"] [class*="sheet_body"]')
    .evaluate((el) => el.scrollTop);
  expect(scrollTop).toBe(0);
});

test("scrolling down hides the nav and shrinks the header; scrolling up restores them @mobile", async ({
  page,
}) => {
  await signInSeeded(page, { transactions: SAMPLE_TXNS });
  const nav = page.getByRole("navigation");
  const header = page.locator("header").first();
  const fullHeight = (await header.boundingBox())!.height;

  await page.evaluate(() => window.scrollBy(0, 600));
  await expect(nav).toHaveCSS("opacity", "0");
  await expect
    .poll(async () => (await header.boundingBox())!.height)
    .toBeLessThan(fullHeight);

  await page.evaluate(() => window.scrollBy(0, -300));
  await expect(nav).toHaveCSS("opacity", "1");

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect
    .poll(async () => (await header.boundingBox())!.height)
    .toBe(fullHeight);
});

test("transactions sort by amount within each month", async ({ page }) => {
  await signInSeeded(page, { transactions: SAMPLE_TXNS });
  await page.goto("/transactions");
  await page.getByRole("button", { name: "Sort by amount" }).click();
  const months = page.locator("main section");
  await expect(months).toHaveCount(2);
  const amounts = async (i: number) =>
    (await months.nth(i).getByRole("button").allInnerTexts()).map((t) =>
      Number(t.match(/₹([\d,]+)/)![1]!.replace(/,/g, "")),
    );
  const thisMonth = await amounts(0);
  expect(thisMonth).toEqual([...thisMonth].sort((a, b) => b - a));
  expect(await amounts(1)).toEqual([2000]);
});
