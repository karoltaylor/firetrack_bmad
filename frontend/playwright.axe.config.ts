import { defineConfig, devices } from "@playwright/test"

const previewHost = "127.0.0.1"
const previewPort = 4173
const baseUrl = `http://${previewHost}:${previewPort}`

export default defineConfig({
  testDir: "./tests/accessibility",
  testMatch: /.*axe\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: baseUrl,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `bun run dev -- --host ${previewHost} --port ${previewPort}`,
    url: baseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
