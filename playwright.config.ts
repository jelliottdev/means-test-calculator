import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    video: {
      mode: "on",
      size: { width: 1280, height: 800 },
    },
    launchOptions: {
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  },
  projects: [
    {
      name: "demo-recording",
      use: { browserName: "chromium" },
    },
  ],
  reporter: "list",
});
