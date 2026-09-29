import { describe, expect, it } from "vitest";
import {
  applyColumnMove,
  applyMove,
  cardMatchesFilters,
  columnDeleteDescription,
  countCards,
  formatCardCount,
} from "@/lib/board";
import type { CardDTO, ColumnDTO } from "@/lib/graphql/types";

function card(id: string, columnId: string, order: number, extra: Partial<CardDTO> = {}): CardDTO {
  return { id, title: `Card ${id}`, description: null, labels: [], order, columnId, ...extra };
}

function column(id: string, cards: CardDTO[], order = 0): ColumnDTO {
  return { id, title: `Col ${id}`, order, cards };
}

function ids(cards: CardDTO[]): string[] {
  return cards.map((c) => c.id);
}

function orders(cards: CardDTO[]): number[] {
  return cards.map((c) => c.order);
}

describe("applyMove — mesmo algoritmo do resolver moveCard", () => {
  it("reordena para baixo na mesma coluna", () => {
    const cols = [
      column("c1", [card("a", "c1", 0), card("b", "c1", 1), card("c", "c1", 2)]),
    ];
    const next = applyMove(cols, "a", "c1", 2);
    expect(ids(next[0].cards)).toEqual(["b", "c", "a"]);
    expect(orders(next[0].cards)).toEqual([0, 1, 2]);
  });

  it("reordena para cima na mesma coluna", () => {
    const cols = [
      column("c1", [card("a", "c1", 0), card("b", "c1", 1), card("c", "c1", 2)]),
    ];
    const next = applyMove(cols, "c", "c1", 0);
    expect(ids(next[0].cards)).toEqual(["c", "a", "b"]);
    expect(orders(next[0].cards)).toEqual([0, 1, 2]);
  });

  it("move entre colunas reindexando origem e destino", () => {
    const cols = [
      column("c1", [card("a", "c1", 0), card("b", "c1", 1)]),
      column("c2", [card("x", "c2", 0), card("y", "c2", 1)]),
    ];
    const next = applyMove(cols, "a", "c2", 1);
    expect(ids(next[0].cards)).toEqual(["b"]);
    expect(orders(next[0].cards)).toEqual([0]);
    expect(ids(next[1].cards)).toEqual(["x", "a", "y"]);
    expect(orders(next[1].cards)).toEqual([0, 1, 2]);
    expect(next[1].cards[1].columnId).toBe("c2");
  });

  it("faz clamp de order além dos limites", () => {
    const cols = [column("c1", [card("a", "c1", 0), card("b", "c1", 1)])];
    expect(ids(applyMove(cols, "a", "c1", 99)[0].cards)).toEqual(["b", "a"]);
    expect(ids(applyMove(cols, "b", "c1", -5)[0].cards)).toEqual(["b", "a"]);
  });

  it("retorna a mesma referência quando o card não existe", () => {
    const cols = [column("c1", [card("a", "c1", 0)])];
    expect(applyMove(cols, "nope", "c1", 0)).toBe(cols);
  });

  it("retorna a mesma referência quando a coluna destino não existe", () => {
    const cols = [column("c1", [card("a", "c1", 0)])];
    expect(applyMove(cols, "a", "ghost", 0)).toBe(cols);
  });
});

describe("applyColumnMove — mesmo algoritmo do resolver moveColumn", () => {
  it("move para trás", () => {
    const cols = [column("a", [], 0), column("b", [], 1), column("c", [], 2)];
    const next = applyColumnMove(cols, "a", 2);
    expect(next.map((c) => c.id)).toEqual(["b", "c", "a"]);
    expect(next.map((c) => c.order)).toEqual([0, 1, 2]);
  });

  it("move para frente", () => {
    const cols = [column("a", [], 0), column("b", [], 1), column("c", [], 2)];
    const next = applyColumnMove(cols, "c", 0);
    expect(next.map((c) => c.id)).toEqual(["c", "a", "b"]);
    expect(next.map((c) => c.order)).toEqual([0, 1, 2]);
  });

  it("não faz nada quando o índice é o atual (mesma referência)", () => {
    const cols = [column("a", [], 0), column("b", [], 1)];
    expect(applyColumnMove(cols, "b", 1)).toBe(cols);
  });

  it("retorna a mesma referência para id desconhecido", () => {
    const cols = [column("a", [], 0)];
    expect(applyColumnMove(cols, "ghost", 0)).toBe(cols);
  });

  it("preserva os cards das colunas", () => {
    const cols = [column("a", [card("x", "a", 0)], 0), column("b", [card("y", "b", 0)], 1)];
    const next = applyColumnMove(cols, "a", 1);
    expect(next[1].cards).toBe(cols[0].cards);
  });
});

describe("cardMatchesFilters — espelha buildCardWhere do servidor", () => {
  const base = { title: "Fix login bug", description: "No modal", labels: ["bug", "ui"] };

  it("sem filtros casa sempre", () => {
    expect(cardMatchesFilters(base, "", [])).toBe(true);
  });

  it("busca casa título sem diferenciar maiúsculas", () => {
    expect(cardMatchesFilters(base, "  LOGIN ", [])).toBe(true);
  });

  it("busca casa descrição", () => {
    expect(cardMatchesFilters(base, "modal", [])).toBe(true);
  });

  it("busca sem resultado não casa", () => {
    expect(cardMatchesFilters(base, "backend", [])).toBe(false);
  });

  it("filtro de label exige interseção", () => {
    expect(cardMatchesFilters(base, "", ["bug"])).toBe(true);
    expect(cardMatchesFilters(base, "", ["infra"])).toBe(false);
  });

  it("busca e label juntos são E lógico", () => {
    expect(cardMatchesFilters(base, "login", ["bug"])).toBe(true);
    expect(cardMatchesFilters(base, "login", ["infra"])).toBe(false);
  });

  it("description nula não quebra a busca", () => {
    expect(cardMatchesFilters({ title: "X", description: null, labels: [] }, "x", [])).toBe(true);
  });
});

describe("countCards", () => {
  it("soma cards de todas as colunas", () => {
    const cols = [
      column("a", [card("1", "a", 0), card("2", "a", 1)]),
      column("b", [card("3", "b", 0)]),
      column("c", []),
    ];
    expect(countCards(cols)).toBe(3);
    expect(countCards([])).toBe(0);
  });
});

describe("formatCardCount", () => {
  it("pluraliza corretamente 0, 1 e n", () => {
    expect(formatCardCount(0)).toBe("0 cards");
    expect(formatCardCount(1)).toBe("1 card");
    expect(formatCardCount(7)).toBe("7 cards");
  });
});

describe("columnDeleteDescription", () => {
  it("coluna vazia não fala em excluir cards", () => {
    expect(columnDeleteDescription("Backlog", 0)).toBe(
      'A coluna "Backlog" não tem cards e será excluída permanentemente. Essa ação não pode ser desfeita.'
    );
  });

  it("um card usa a forma singular", () => {
    expect(columnDeleteDescription("To Do", 1)).toBe(
      'A coluna "To Do" e seu único card serão excluídos permanentemente. Essa ação não pode ser desfeita.'
    );
  });

  it("vários cards pluralizam", () => {
    expect(columnDeleteDescription("To Do", 4)).toContain('"To Do" e seus 4 cards');
  });
});
