import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { resolvers } from "@/lib/graphql/resolvers";

// Resolvers são funções (parent, args) — chamadas direto, contra kanbanql_test
// (DATABASE_URL travada em vitest.setup.ts; schema via pretest/migrate deploy).

async function mkColumn(title: string) {
  return resolvers.Mutation.createColumn(null, { input: { title } });
}

async function mkCard(columnId: string, input: Record<string, unknown> = {}) {
  return resolvers.Mutation.createCard(null, { input: { title: "Card", columnId, ...input } });
}

beforeEach(async () => {
  await prisma.card.deleteMany();
  await prisma.column.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("validação de título no servidor", () => {
  it("rejeita createColumn com título vazio", async () => {
    await expect(mkColumn("   ")).rejects.toThrow("Título é obrigatório");
  });

  it("rejeita renameColumn com título vazio", async () => {
    const col = await mkColumn("Backlog");
    await expect(
      resolvers.Mutation.renameColumn(null, { id: col.id, title: " " })
    ).rejects.toThrow("Título é obrigatório");
  });

  it("rejeita createCard com título vazio", async () => {
    const col = await mkColumn("To Do");
    await expect(mkCard(col.id, { title: "  " })).rejects.toThrow("Título é obrigatório");
  });

  it("rejeita updateCard com título vazio", async () => {
    const col = await mkColumn("To Do");
    const c = await mkCard(col.id, { title: "Original" });
    await expect(
      resolvers.Mutation.updateCard(null, { id: c.id, input: { title: "   " } })
    ).rejects.toThrow("Título é obrigatório");
  });

  it("normaliza título (trim) ao salvar", async () => {
    const col = await mkColumn("To Do");
    const c = await mkCard(col.id, { title: "  Com espaço  " });
    expect(c.title).toBe("Com espaço");
  });
});

describe("labels e descrição normalizados no servidor", () => {
  it("deduplica, trim e lowercase das labels", async () => {
    const col = await mkColumn("To Do");
    const c = await mkCard(col.id, { labels: [" Bug ", "bug", "  ", "UI"] });
    expect(c.labels).toEqual(["bug", "ui"]);
  });

  it("description só espaços vira null", async () => {
    const col = await mkColumn("To Do");
    const c = await mkCard(col.id, { description: "   " });
    expect(c.description).toBeNull();
  });

  it("updateCard normaliza labels e description", async () => {
    const col = await mkColumn("To Do");
    const c = await mkCard(col.id, { title: "Keep", labels: ["a"] });
    const updated = await resolvers.Mutation.updateCard(null, {
      id: c.id,
      input: { description: "  desc  ", labels: ["New ", "new"] },
    });
    expect(updated.title).toBe("Keep");
    expect(updated.description).toBe("desc");
    expect(updated.labels).toEqual(["new"]);
  });
});

describe("colunas — CRUD, ordenação e cascade", () => {
  it("cria colunas com order appended", async () => {
    const a = await mkColumn("A");
    const b = await mkColumn("B");
    expect(a.order).toBe(0);
    expect(b.order).toBe(1);
  });

  it("renameColumn trimma o título", async () => {
    const col = await mkColumn("To Do");
    const renamed = await resolvers.Mutation.renameColumn(null, {
      id: col.id,
      title: "  Feito  ",
    });
    expect(renamed.title).toBe("Feito");
  });

  it("moveColumn reordena e reindexa", async () => {
    const a = await mkColumn("A");
    await mkColumn("B");
    await mkColumn("C");
    await resolvers.Mutation.moveColumn(null, { id: a.id, order: 2 });
    const cols = await resolvers.Query.columns();
    expect(cols.map((c: { title: string }) => c.title)).toEqual(["B", "C", "A"]);
    expect(cols.map((c: { order: number }) => c.order)).toEqual([0, 1, 2]);
  });

  it("moveColumn com order além do tamanho vai para o fim", async () => {
    const a = await mkColumn("A");
    await mkColumn("B");
    await resolvers.Mutation.moveColumn(null, { id: a.id, order: 99 });
    const cols = await resolvers.Query.columns();
    expect(cols.map((c: { title: string }) => c.title)).toEqual(["B", "A"]);
  });

  it("moveColumn com id desconhecido rejeita", async () => {
    await expect(
      resolvers.Mutation.moveColumn(null, { id: "ghost", order: 0 })
    ).rejects.toThrow();
  });

  it("deleteColumn remove os cards em cascata", async () => {
    const col = await mkColumn("Lixeira");
    await mkCard(col.id);
    await mkCard(col.id);
    expect(await prisma.card.count()).toBe(2);

    await resolvers.Mutation.deleteColumn(null, { id: col.id });

    expect(await prisma.column.count()).toBe(0);
    expect(await prisma.card.count()).toBe(0);
  });
});

describe("moveCard — espelha applyMove", () => {
  it("reordena na mesma coluna", async () => {
    const col = await mkColumn("To Do");
    const c1 = await mkCard(col.id, { title: "1" });
    await mkCard(col.id, { title: "2" });
    await mkCard(col.id, { title: "3" });

    await resolvers.Mutation.moveCard(null, { id: c1.id, columnId: col.id, order: 2 });

    const cards = await prisma.card.findMany({
      where: { columnId: col.id },
      orderBy: { order: "asc" },
    });
    expect(cards.map((c) => c.title)).toEqual(["2", "3", "1"]);
    expect(cards.map((c) => c.order)).toEqual([0, 1, 2]);
  });

  it("move entre colunas reindexando as duas", async () => {
    const a = await mkColumn("A");
    const b = await mkColumn("B");
    const c1 = await mkCard(a.id, { title: "1" });
    await mkCard(a.id, { title: "2" });

    await resolvers.Mutation.moveCard(null, { id: c1.id, columnId: b.id, order: 0 });

    const inA = await prisma.card.findMany({ where: { columnId: a.id }, orderBy: { order: "asc" } });
    const inB = await prisma.card.findMany({ where: { columnId: b.id }, orderBy: { order: "asc" } });
    expect(inA.map((c) => c.title)).toEqual(["2"]);
    expect(inA[0].order).toBe(0);
    expect(inB.map((c) => c.title)).toEqual(["1"]);
    expect(inB[0].columnId).toBe(b.id);
  });

  it("clampa order além do tamanho", async () => {
    const col = await mkColumn("To Do");
    const c1 = await mkCard(col.id, { title: "1" });
    await mkCard(col.id, { title: "2" });

    await resolvers.Mutation.moveCard(null, { id: c1.id, columnId: col.id, order: 99 });

    const cards = await prisma.card.findMany({
      where: { columnId: col.id },
      orderBy: { order: "asc" },
    });
    expect(cards.map((c) => c.title)).toEqual(["2", "1"]);
  });

  it("coluna destino inexistente rejeita", async () => {
    const col = await mkColumn("To Do");
    const c1 = await mkCard(col.id);
    await expect(
      resolvers.Mutation.moveCard(null, { id: c1.id, columnId: "ghost", order: 0 })
    ).rejects.toThrow();
  });
});

describe("consultas — busca, labels e order", () => {
  it("Query.columns retorna ordenado por order", async () => {
    await mkColumn("Um");
    await mkColumn("Dois");
    const cols = await resolvers.Query.columns();
    expect(cols.map((c: { title: string }) => c.title)).toEqual(["Um", "Dois"]);
  });

  it("Query.labels é única e ordenada", async () => {
    const col = await mkColumn("To Do");
    await mkCard(col.id, { title: "A", labels: ["Bug", "UI"] });
    await mkCard(col.id, { title: "B", labels: ["bug", "infra"] });
    expect(await resolvers.Query.labels()).toEqual(["bug", "infra", "ui"]);
  });

  it("busca casa título sem diferenciar maiúsculas", async () => {
    const col = await mkColumn("To Do");
    await mkCard(col.id, { title: "Fix login" });
    await mkCard(col.id, { title: "Login page" });
    await mkCard(col.id, { title: "Outro assunto" });

    const found = await resolvers.Query.cards(null, { search: "LOGIN" });
    expect(found).toHaveLength(2);
  });

  it("busca casa descrição", async () => {
    const col = await mkColumn("To Do");
    await mkCard(col.id, { title: "A", description: "fast turnaround" });
    await mkCard(col.id, { title: "B" });

    const found = await resolvers.Query.cards(null, { search: "fast" });
    expect(found).toHaveLength(1);
    expect(found[0].title).toBe("A");
  });

  it("filtro por labels usa hasSome (OR)", async () => {
    const col = await mkColumn("To Do");
    await mkCard(col.id, { title: "A", labels: ["bug"] });
    await mkCard(col.id, { title: "B", labels: ["infra"] });

    const found = await resolvers.Query.cards(null, { labels: ["bug"] });
    expect(found.map((c: { title: string }) => c.title)).toEqual(["A"]);
  });

  it("coluna filtra os próprios cards com search (field resolver Column.cards)", async () => {
    const col = await mkColumn("To Do");
    await mkCard(col.id, { title: "Fix login" });
    await mkCard(col.id, { title: "Outro" });

    const filtered = await resolvers.Column.cards({ id: col.id }, { search: "login" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe("Fix login");
  });
});

describe("seed", () => {
  it("popula board exemplo apenas uma vez", async () => {
    expect(await resolvers.Mutation.seed()).toBe(true);
    expect(await prisma.column.count()).toBe(3);
    expect(await prisma.card.count()).toBe(4);

    expect(await resolvers.Mutation.seed()).toBe(true);
    expect(await prisma.column.count()).toBe(3);
    expect(await prisma.card.count()).toBe(4);
  });
});
