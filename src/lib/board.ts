import type { CardDTO, ColumnDTO } from "@/lib/graphql/types";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

/**
 * Reordena localmente exatamente como o resolver `moveCard` faz no servidor:
 * remove o card da origem, insere no destino no índice informado e reindexa
 * as duas listas. Usado como atualização otimista entre o drop e o refetch,
 * evitando que o card "volte" para a posição antiga enquanto a rede responde.
 */
export function applyMove(
  columns: ColumnDTO[],
  cardId: string,
  destColumnId: string,
  order: number
): ColumnDTO[] {
  const source = columns.find((col) => col.cards.some((c) => c.id === cardId));
  const card = source?.cards.find((c) => c.id === cardId);
  if (!source || !card) return columns;

  const strip = (cards: CardDTO[]): CardDTO[] =>
    cards.filter((c) => c.id !== cardId).map((c, i) => ({ ...c, order: i }));

  if (source.id === destColumnId) {
    const rest = strip(source.cards);
    const at = clamp(order, 0, rest.length);
    const merged = [
      ...rest.slice(0, at),
      { ...card, order: at },
      ...rest.slice(at),
    ].map((c, i) => ({ ...c, order: i }));
    return columns.map((col) => (col.id === source.id ? { ...col, cards: merged } : col));
  }

  const dest = columns.find((col) => col.id === destColumnId);
  if (!dest) return columns;

  const at = clamp(order, 0, dest.cards.length);
  const merged = [
    ...dest.cards.slice(0, at),
    { ...card, columnId: destColumnId, order: at },
    ...dest.cards.slice(at),
  ].map((c, i) => ({ ...c, order: i }));

  return columns.map((col) => {
    if (col.id === source.id) return { ...col, cards: strip(col.cards) };
    if (col.id === destColumnId) return { ...col, cards: merged };
    return col;
  });
}

/** Espelha o algoritmo do resolver `moveColumn`: remove a coluna da posição
 *  atual, insere no índice informado e reindexa. Retorna a MESMA referência
 *  quando nada muda (o chamador pode pular a mutation). */
export function applyColumnMove(
  columns: ColumnDTO[],
  columnId: string,
  order: number
): ColumnDTO[] {
  const from = columns.findIndex((c) => c.id === columnId);
  if (from === -1) return columns;
  const rest = columns.filter((c) => c.id !== columnId);
  const at = clamp(order, 0, rest.length);
  if (at === from) return columns;
  return [...rest.slice(0, at), columns[from], ...rest.slice(at)].map((c, i) =>
    c.order === i ? c : { ...c, order: i }
  );
}

/** Espelha o filtro do servidor (`buildCardWhere`) para saber se um card
 *  ficaria visível com a busca/labels atuais. */
export function cardMatchesFilters(
  card: Pick<CardDTO, "title" | "description" | "labels">,
  search: string,
  activeLabels: string[]
): boolean {
  if (activeLabels.length > 0 && !card.labels.some((l) => activeLabels.includes(l))) {
    return false;
  }
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return (
    card.title.toLowerCase().includes(query) ||
    (card.description ?? "").toLowerCase().includes(query)
  );
}

export function countCards(columns: ColumnDTO[]): number {
  return columns.reduce((total, col) => total + col.cards.length, 0);
}
