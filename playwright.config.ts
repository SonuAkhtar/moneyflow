import { defineConfig, devices } from "@playwright/test";

const APP_PORT = 3100;
const MOCK_PORT = 54399;

const e2eEnv = {
  NEXT_DIST_DIR: ".next-e2e",
  NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e-anon",
  NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${APP_PORT}`,
  SUPABASE_SERVICE_ROLE_KEY: "e2e-service",
  NEXT_TELEMETRY_DISABLED: "1",
};

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${APP_PORT}`,
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], viewport: { width: 360, height: 780 } },
      grep: /@mobile/,
    },
  ],
  webServer: [
    {
      command: "node e2e/mock-supabase.mjs",
      url: `http://127.0.0.1:${MOCK_PORT}/__state`,
      reuseExistingServer: false,
      env: { MOCK_SUPABASE_PORT: String(MOCK_PORT) },
    },
    {
      command: `npx next build && npx next start -p ${APP_PORT} -H 127.0.0.1`,
      url: `http://127.0.0.1:${APP_PORT}/login`,
      reuseExistingServer: false,
      timeout: 420_000,
      env: e2eEnv,
    },
  ],
});
