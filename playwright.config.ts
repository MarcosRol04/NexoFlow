import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Las pruebas end-to-end arrancan la aplicación contra la base de datos de
// pruebas (TEST_DATABASE_URL), nunca contra la base de datos real.
if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL,
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Requiere haber ejecutado `npm run build` antes (ver docs/testing.md).
    command: `npx next start --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: testDatabaseUrl ?? "",
      APP_URL: baseURL,
      COOKIE_SECURE: "false",
    },
  },
});
