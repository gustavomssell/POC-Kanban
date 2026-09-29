// Recria o banco de teste (kanbanql_test) e aplica as migrations.
// Roda automaticamente antes de `npm test` (hook pretest) e no CI.
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const BASE_URL = "postgresql://kanban:kanban@localhost:5437";
const TEST_URL = `${BASE_URL}/kanbanql_test?schema=public`;

async function main() {
  const admin = new PrismaClient({ datasourceUrl: `${BASE_URL}/postgres` });
  try {
    await admin.$executeRawUnsafe("DROP DATABASE IF EXISTS kanbanql_test WITH (FORCE)");
    await admin.$executeRawUnsafe("CREATE DATABASE kanbanql_test");
  } finally {
    await admin.$disconnect();
  }

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_URL },
  });

  console.log("Banco de teste pronto: kanbanql_test");
}

main().catch((err) => {
  console.error("\nFalha ao preparar o banco de teste.");
  console.error("O Postgres está no ar? Rode: npm run db:up");
  console.error(err?.message ?? err);
  process.exit(1);
});
