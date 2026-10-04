import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { resetMock } from "./helpers";

test.beforeEach(resetMock);

test("protected pages redirect to login @mobile", async ({ page }) => {
  for (const path of ["/", "/savings", "/analytics", "/emi", "/profile"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
});

test("sends security headers", async ({ request }) => {
  const res = await request.get("/login");
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["content-security-policy"]).toContain("object-src 'none'");
  expect(h["content-security-policy"]).toContain("http://127.0.0.1:54399");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["strict-transport-security"]).toContain("max-age=");
  expect(h["x-powered-by"]).toBeUndefined();
});

test("public pages load without CSP violations or console errors", async ({
  page,
}) => {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(m.text());
  });
  page.on("pageerror", (e) => problems.push(e.message));
  for (const path of ["/login", "/signup", "/forgot-password", "/offline"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  expect(
    problems.filter((p) => /Content Security Policy|Refused to/i.test(p)),
  ).toEqual([]);
  expect(problems).toEqual([]);
});

test("robots.txt and social preview are served", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("Allow: /login");
  const og = await request.get("/opengraph-image");
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toContain("image/png");
  const html = await (await request.get("/login")).text();
  expect(html).toContain('property="og:title"');
});

test("signup validates input", async ({ page }) => {
  await page.goto("/signup");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Tell us your name")).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByLabel("Confirm password").fill("different");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Use at least 8 characters")).toBeVisible();
  await expect(page.getByText("Passwords do not match")).toBeVisible();
});

for (const path of ["/login", "/signup", "/forgot-password"]) {
  test(`${path} has no serious accessibility violations @mobile`, async ({
    page,
  }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    );
    expect(serious.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
}
