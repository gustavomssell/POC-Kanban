"use client";

import { useState } from "react";
import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { SearchX } from "lucide-react";
import { useBoard } from "@/hooks/use-board";
import { columnDeleteDescription, countCards } from "@/lib/board";
import type { CardDTO, ColumnDTO } from "@/lib/graphql/types";
import { Button } from "@/components/ui/button";
import { BoardEmpty, BoardError, BoardSkeleton } from "./board-states";
import { BoardToolbar } from "./board-toolbar";
import { KanbanColumn } from "./kanban-column";
import { CardDialog } from "./card-dialog";
import { ColumnDialog } from "./column-dialog";
import { ConfirmDialog } from "./confirm-dialog";

type PendingDelete =
  | { type: "card"; card: CardDTO }
  | { type: "column"; column: ColumnDTO };

/**
 * Board Kanban: orquestra DnD + diálogos. Dados e mutations vivem em `useBoard`.
 * A4: um único return — toolbar e diálogos existem em TODOS os estados
 * (loading/erro/vazio), então nenhuma ação fica "morta".
 */
export function KanbanBoard() {
  const board = useBoard();
  const { columns } = board;

  const [activeCard, setActiveCard] = useState<CardDTO | null>(null);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CardDTO | null>(null);
  const [targetColumn, setTargetColumn] = useState<string | undefined>();
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<ColumnDTO | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function findCard(id: string): CardDTO | undefined {
    for (const col of columns) {
      const found = col.cards.find((c) => c.id === id);
      if (found) return found;
    }
    return undefined;
  }

  function handleDragStart(e: DragStartEvent) {
    const card = e.active.data.current?.card as CardDTO | undefined;
    if (card) setActiveCard(card);
  }

  function handleDragCancel() {
    setActiveCard(null);
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveCard(null);
    const { active, over } = e;
    if (!over) return;

    // B2: coluna arrastada → reordena colunas (independente de filtro de cards).
    if (active.data.current?.type === "column") {
      let overColumnId: string | undefined;
      if (over.data.current?.type === "column") {
        overColumnId = over.data.current.columnId as string;
      } else if (over.data.current?.type === "card") {
        overColumnId = (over.data.current.card as CardDTO).columnId;
      } else if (columns.some((c) => c.id === over.id)) {
        overColumnId = over.id as string;
      }
      if (!overColumnId) return;
      const to = columns.findIndex((c) => c.id === overColumnId);
      const from = columns.findIndex((c) => c.id === active.id);
      if (to < 0 || from < 0 || from === to) return;
      await board.moveColumn(active.id as string, to);
      return;
    }

    // A1: com filtro/fetch ativo a lista local não é a do servidor.
    if (board.reorderLocked) return;

    const card = (active.data.current?.card as CardDTO | undefined) ?? findCard(active.id as string);
    if (!card) return;

    // Destino: área da coluna ou posição de outro card.
    let destColumnId: string | undefined;
    let destIndex = 0;

    if (over.data.current?.type === "column") {
      destColumnId = over.data.current.columnId as string;
      destIndex = columns.find((c) => c.id === destColumnId)?.cards.length ?? 0;
    } else {
      const overCard =
        (over.data.current?.card as CardDTO | undefined) ?? findCard(over.id as string);
      if (!overCard) {
        // Fallback: id da coluna sem payload.
        destColumnId = over.id as string;
        destIndex = columns.find((c) => c.id === destColumnId)?.cards.length ?? 0;
      } else {
        destColumnId = overCard.columnId;
        destIndex =
          columns.find((c) => c.id === destColumnId)?.cards.findIndex((c) => c.id === overCard.id) ?? 0;
      }
    }

    if (!destColumnId || destIndex < 0) return;

    // Sem movimento real → evita mutation desnecessária.
    const sourceCol = columns.find((c) => c.id === card.columnId);
    const oldIndex = sourceCol?.cards.findIndex((c) => c.id === card.id) ?? -1;
    if (oldIndex === -1) return;
    if (card.columnId === destColumnId && oldIndex === destIndex) return;

    await board.moveCard(card.id, destColumnId, destIndex);
  }

  function openNewCard(columnId: string) {
    setEditing(null);
    setTargetColumn(columnId);
    setCardDialogOpen(true);
  }

  function openEditCard(card: CardDTO) {
    setEditing(card);
    setTargetColumn(card.columnId);
    setCardDialogOpen(true);
  }

  function openNewColumn() {
    setEditingColumn(null);
    setColumnDialogOpen(true);
  }

  // A5: colunas existem mas NENHUM card passa no filtro atual.
  const filterBannerVisible =
    board.isFiltering &&
    !board.loading &&
    !board.error &&
    columns.length > 0 &&
    countCards(columns) === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <BoardToolbar
        search={board.search}
        onSearchChange={board.setSearch}
        allLabels={board.allLabels}
        activeLabels={board.activeLabels}
        onToggleLabel={board.toggleLabel}
        onClearFilters={board.clearFilters}
        isFiltering={board.isFiltering}
        onNewColumn={openNewColumn}
      />

      {filterBannerVisible && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed bg-muted/40 px-4 py-3"
        >
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <SearchX className="h-4 w-4" aria-hidden="true" />
            Nenhum card corresponde aos filtros atuais.
          </span>
          <Button variant="ghost" size="sm" onClick={board.clearFilters}>
            Limpar filtros
          </Button>
        </div>
      )}

      {board.loading ? (
        <BoardSkeleton />
      ) : board.error ? (
        <BoardError message={board.error.message} onRetry={() => board.refetch()} />
      ) : columns.length === 0 ? (
        <BoardEmpty
          isFiltering={board.isFiltering}
          onClearFilters={board.clearFilters}
          onSeed={board.seed}
          seeding={board.seeding}
          onNewColumn={openNewColumn}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={columns.map((c) => c.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto pb-4">
              {columns.map((col) => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  reorderLocked={board.reorderLocked}
                  onAdd={openNewCard}
                  onRename={(column) => {
                    setEditingColumn(column);
                    setColumnDialogOpen(true);
                  }}
                  onEdit={openEditCard}
                  onDelete={(card) => setPendingDelete({ type: "card", card })}
                  onDeleteColumn={(column) => setPendingDelete({ type: "column", column })}
                />
              ))}
            </div>
          </SortableContext>
          {/* dropAnimation=null: o default do dnd-kit mede o nó de origem
              (que só muda no refetch) e anima o overlay voltando pra lá. */}
          <DragOverlay dropAnimation={null}>
            {activeCard ? (
              <div className="w-72 rotate-2 rounded-xl border bg-card p-3 text-sm font-medium shadow-xl sm:w-80">
                {activeCard.title}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* A4: diálogos fora do switch de estados — montados apenas quando abertos. */}
      {cardDialogOpen && (
        <CardDialog
          open
          onOpenChange={(v) => {
            setCardDialogOpen(v);
            if (!v) setEditing(null);
          }}
          initial={editing}
          defaultColumnId={targetColumn}
          columns={columns}
          onSubmit={(form) => board.saveCard(editing?.id ?? null, form)}
        />
      )}

      {columnDialogOpen && (
        <ColumnDialog
          open
          onOpenChange={(v) => {
            setColumnDialogOpen(v);
            if (!v) setEditingColumn(null);
          }}
          columnId={editingColumn?.id}
          initialTitle={editingColumn?.title}
          onSubmit={(title) =>
            editingColumn
              ? board.renameColumn(editingColumn.id, title)
              : board.createColumn(title)
          }
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          open
          onOpenChange={(v) => {
            if (!v) setPendingDelete(null);
          }}
          title={pendingDelete.type === "card" ? "Excluir card?" : "Excluir coluna?"}
          description={
            pendingDelete.type === "card"
              ? `"${pendingDelete.card.title}" será removido permanentemente. Essa ação não pode ser desfeita.`
              : columnDeleteDescription(
                  pendingDelete.column.title,
                  pendingDelete.column.cards.length
                )
          }
          onConfirm={async () => {
            if (pendingDelete.type === "card") {
              await board.deleteCard(pendingDelete.card.id);
            } else {
              await board.deleteColumn(pendingDelete.column.id);
            }
          }}
        />
      )}
    </div>
  );
}
