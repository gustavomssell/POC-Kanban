// Trava de segurança: roda antes de qualquer import dos testes e aponta o
// Prisma para o banco de teste — um setup errado nunca toca no banco de dev.
process.env.DATABASE_URL =
  "postgresql://kanban:kanban@localhost:5437/kanbanql_test?schema=public";
