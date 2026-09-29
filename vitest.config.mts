import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Banco exclusivo dos testes — nunca o `kanbanql` de desenvolvimento.
// A trava de segurança extra (antes de qualquer import) está em vitest.setup.ts.
const TEST_DATABASE_URL =
  "postgresql://kanban:kanban@localhost:5437/kanbanql_test?schema=public";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    env: { DATABASE_URL: TEST_DATABASE_URL },
  },
});
