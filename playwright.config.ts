import { defineConfig, devices } from "@playwright/test";

// Porta dedicada do E2E: o dev server (3000) roda junto sem conflito —
// `next start` usa o build de produção, que não disputa `.next/dev`.
const PORT = 3100;
const TEST_DATABASE_URL =
  "postgresql://kanban:kanban@localhost:5437/kanbanql_test?schema=public";

export default defineConfig({
  testDir: "./e2e",
  // Banco único compartilhado entre specs → nada de paralelismo.
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Reseta o banco de teste, gera o build e sobe o server — a cada run.
    command: "npm run test:e2e:serve",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: { DATABASE_URL: TEST_DATABASE_URL },
  },
});
