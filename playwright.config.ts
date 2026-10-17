import { defineConfig, devices } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// A fresh vault keeps synthetic uploads and fixture encryption keys away from local storage.
const apiRuntime = process.env.CI
  ? mkdtempSync(path.join(tmpdir(), "atlas-browser-"))
  : undefined;

// CI owns these isolated servers. Local review uses a user-started frontend.
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI && !process.env.ATLAS_BROWSER_NO_RETRIES ? 1 : 0,
  timeout: 45000,
  globalTimeout: 20 * 60 * 1000,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ["json", { outputFile: "test-results/browser-results.json" }],
  ],
  use: {
    baseURL: process.env.CI
      ? "https://127.0.0.1:3443"
      : "http://127.0.0.1:3300",
    ignoreHTTPSErrors: !!process.env.CI,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: process.env.CI
    ? [
        {
          command: `node "${path.resolve("apps/api/dist/main.js")}"`,
          cwd: apiRuntime,
          url: "http://127.0.0.1:4400/api/health",
          reuseExistingServer: false,
          timeout: 120000,
          env: {
            NODE_ENV: "test",
            PORT: "4400",
            DATABASE_URL:
              process.env.DATABASE_APP_URL || process.env.DATABASE_URL || "",
          },
        },
        {
          command:
            "npm run start --workspace=@atlas/web-admin -- --hostname 127.0.0.1 --port 3300",
          url: "http://127.0.0.1:3300/login",
          reuseExistingServer: false,
          timeout: 120000,
          env: { NODE_ENV: "production", API_URL: "http://127.0.0.1:4400/api" },
        },
        {
          command: "node scripts/maintenance/browser-tls-proxy.cjs",
          url: "https://127.0.0.1:3443/login",
          ignoreHTTPSErrors: true,
          reuseExistingServer: false,
        },
      ]
    : undefined,
});
