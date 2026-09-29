"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { toast } from "sonner";
import { useDebouncedValue } from "@/hooks/use-debounce";
import {
  CREATE_CARD,
  CREATE_COLUMN,
  DELETE_CARD,
  DELETE_COLUMN,
  GET_BOARD,
  MOVE_CARD,
  MOVE_COLUMN,
  RENAME_COLUMN,
  SEED,
  UPDATE_CARD,
} from "@/lib/graphql/operations";
import { applyColumnMove, applyMove, cardMatchesFilters } from "@/lib/board";
import type { BoardData, CardFormData, ColumnDTO } from "@/lib/graphql/types";

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Erro inesperado";
}

/**
 * Camada de dados do board: query com busca debounced + filtro de labels,
 * e mutations com feedback (toast) e refetch centralizado.
 */
export function useBoard() {
  const [search, setSearch] = useState("");
  const [activeLabels, setActiveLabels] = useState<string[]>([]);
  const debouncedSearch = useDebouncedValue(search, 350);

  const query = useQuery<BoardData>(GET_BOARD, {
    variables: {
      search: debouncedSearch.trim() || null,
      labels: activeLabels.length ? activeLabels : null,
    },
    fetchPolicy: "cache-and-network",
  });

  const [moveCardMut] = useMutation(MOVE_CARD);
  const [createCardMut] = useMutation(CREATE_CARD);
  const [updateCardMut] = useMutation(UPDATE_CARD);
  const [deleteCardMut] = useMutation(DELETE_CARD);
  const [createColumnMut] = useMutation(CREATE_COLUMN);
  const [renameColumnMut] = useMutation(RENAME_COLUMN);
  const [moveColumnMut] = useMutation(MOVE_COLUMN);
  const [deleteColumnMut] = useMutation(DELETE_COLUMN);
  const [seedMut, { loading: seeding }] = useMutation(SEED);

  // A2+A3: `previousData` mantém o último dado conhecido durante a troca de
  // variáveis (sem skeleton piscando); erro só aparece quando NENHUM dado
  // existe — refetch falho com cache preenchido deixa o board na tela.
  const effective = query.data ?? query.previousData;
  const dataColumns = useMemo(() => effective?.columns ?? [], [effective]);
  const [optimisticColumns, setOptimisticColumns] = useState<ColumnDTO[] | null>(null);
  const columns = optimisticColumns ?? dataColumns;
  const allLabels = useMemo(() => effective?.labels ?? [], [effective]);
  const loading = query.loading && !effective;
  const error = query.error && !query.data ? query.error : null;

  // A1: reordena só quando a lista local é idêntica à do servidor — filtros
  // aplicados ou fetch sem dado próprio invalidam o índice do drop.
  const reorderLocked =
    debouncedSearch.trim() !== "" || activeLabels.length > 0 || (query.loading && !query.data);

  const toggleLabel = useCallback((label: string) => {
    setActiveLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSearch("");
    setActiveLabels([]);
  }, []);

  async function moveCard(id: string, columnId: string, order: number) {
    // Otimista: aplica localmente o mesmo algoritmo do servidor para o card
    // já nascer na coluna de destino no frame do drop (sem snap-back).
    const next = applyMove(columns, id, columnId, order);
    setOptimisticColumns(next);
    try {
      await moveCardMut({ variables: { id, columnId, order } });
    } catch (err) {
      toast.error(`Não foi possível mover o card: ${toMessage(err)}`);
    } finally {
      try {
        await query.refetch();
      } catch {
        // refetch falhou — limpa assim mesmo e volta ao cache atual
      }
      // Limpa só se outro move em sequência não sobrescreveu esta otimização.
      setOptimisticColumns((prev) => (prev === next ? null : prev));
    }
  }

  async function saveCard(editingId: string | null, form: CardFormData) {
    try {
      if (editingId) {
        await updateCardMut({
          variables: {
            id: editingId,
            input: {
              title: form.title,
              description: form.description,
              labels: form.labels,
            },
          },
        });
        toast.success("Card atualizado.");
      } else {
        await createCardMut({ variables: { input: form } });
        toast.success("Card criado.");
      }
      // A5: filtros ativos esconderiam o card salvo → limpa os filtros para o
      // usuário vê-lo (limpar muda as variáveis e o Apollo refetcha sozinho).
      const appliedSearch = debouncedSearch.trim();
      const filteredOut =
        (appliedSearch !== "" || activeLabels.length > 0) &&
        !cardMatchesFilters(
          { title: form.title, description: form.description ?? null, labels: form.labels },
          appliedSearch,
          activeLabels
        );
      if (filteredOut) {
        clearFilters();
        return true;
      }
      await query.refetch();
      return true;
    } catch (err) {
      toast.error(`Não foi possível salvar: ${toMessage(err)}`);
      return false;
    }
  }

  async function deleteCard(id: string) {
    try {
      await deleteCardMut({ variables: { id } });
      toast.success("Card excluído.");
      await query.refetch();
    } catch (err) {
      toast.error(`Não foi possível excluir: ${toMessage(err)}`);
    }
  }

  async function createColumn(title: string) {
    try {
      await createColumnMut({ variables: { input: { title } } });
      toast.success(`Coluna "${title}" criada.`);
      await query.refetch();
      return true;
    } catch (err) {
      toast.error(`Não foi possível criar a coluna: ${toMessage(err)}`);
      return false;
    }
  }

  async function renameColumn(id: string, title: string) {
    try {
      await renameColumnMut({ variables: { id, title } });
      toast.success("Coluna renomeada.");
      await query.refetch();
      return true;
    } catch (err) {
      toast.error(`Não foi possível renomear: ${toMessage(err)}`);
      return false;
    }
  }

  async function deleteColumn(id: string) {
    try {
      await deleteColumnMut({ variables: { id } });
      toast.success("Coluna excluída.");
      await query.refetch();
    } catch (err) {
      toast.error(`Não foi possível excluir: ${toMessage(err)}`);
    }
  }

  async function moveColumn(id: string, order: number) {
    // Otimista: mesmo algoritmo do resolver `moveColumn` (B2), sem snap-back.
    const next = applyColumnMove(columns, id, order);
    if (next === columns) return;
    setOptimisticColumns(next);
    try {
      await moveColumnMut({ variables: { id, order } });
    } catch (err) {
      toast.error(`Não foi possível mover a coluna: ${toMessage(err)}`);
    } finally {
      try {
        await query.refetch();
      } catch {
        // refetch falhou — mantém o cache atual
      }
      setOptimisticColumns((prev) => (prev === next ? null : prev));
    }
  }

  async function seed() {
    try {
      await seedMut();
      toast.success("Dados de exemplo carregados.");
      // A5: com filtro ativo os dados recém-criados ficariam invisíveis.
      if (debouncedSearch.trim() !== "" || activeLabels.length > 0) {
        clearFilters();
      } else {
        await query.refetch();
      }
    } catch (err) {
      toast.error(`Não foi possível carregar exemplos: ${toMessage(err)}`);
    }
  }

  return {
    // filtros
    search,
    setSearch,
    activeLabels,
    toggleLabel,
    clearFilters,
    isFiltering: search.trim() !== "" || activeLabels.length > 0,
    reorderLocked,
    // dados
    columns,
    allLabels,
    loading,
    error,
    refetch: query.refetch,
    // ações
    moveCard,
    saveCard,
    deleteCard,
    createColumn,
    renameColumn,
    deleteColumn,
    moveColumn,
    seed,
    seeding,
  };
}

export type UseBoard = ReturnType<typeof useBoard>;
