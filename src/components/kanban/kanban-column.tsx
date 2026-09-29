"use client";

import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KanbanCard } from "./kanban-card";
import type { CardDTO, ColumnDTO } from "@/lib/graphql/types";

type Props = {
  column: ColumnDTO;
  /** A1: cards não reordenam com filtro ativo (mensagem de vazio muda junto). */
  reorderLocked: boolean;
  onAdd: (columnId: string) => void;
  onRename: (column: ColumnDTO) => void;
  onEdit: (card: CardDTO) => void;
  onDelete: (card: CardDTO) => void;
  onDeleteColumn: (column: ColumnDTO) => void;
};

export function KanbanColumn({
  column,
  reorderLocked,
  onAdd,
  onRename,
  onEdit,
  onDelete,
  onDeleteColumn,
}: Props) {
  // B2: a coluna é sortable (B2) E o alvo de drop dos cards (isOver).
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: column.id,
    data: { type: "column", columnId: column.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <section
      ref={setNodeRef}
      style={style}
      aria-label={`Coluna ${column.title}, ${column.cards.length} cards`}
      className={`group flex max-h-full w-72 shrink-0 flex-col rounded-xl border bg-muted/40 p-3 transition-colors sm:w-80 ${
        isOver ? "border-primary bg-primary/5" : ""
      } ${isDragging ? "opacity-50" : ""}`}
    >
      <header className="mb-2 flex items-center justify-between gap-1 px-0.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none rounded p-0.5 text-muted-foreground hover:text-foreground active:cursor-grabbing"
            aria-label={`Reordenar coluna ${column.title}`}
            title="Reordenar coluna"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
            <span className="truncate">{column.title}</span>
            <span
              aria-label={`${column.cards.length} cards`}
              className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
            >
              {column.cards.length}
            </span>
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
            aria-label={`Renomear coluna ${column.title}`}
            title="Renomear"
            onClick={() => onRename(column)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
            aria-label={`Excluir coluna ${column.title}`}
            title="Excluir"
            onClick={() => onDeleteColumn(column)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label={`Adicionar card em ${column.title}`}
            title="Adicionar card"
            onClick={() => onAdd(column.id)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <SortableContext items={column.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-10 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
          {column.cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              draggable={!reorderLocked}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
          {column.cards.length === 0 && (
            <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
              {reorderLocked ? "Nenhum card aqui" : "Arraste cards para cá"}
            </div>
          )}
        </div>
      </SortableContext>

      <Button
        variant="ghost"
        size="sm"
        className="mt-2 justify-start text-muted-foreground hover:text-foreground"
        onClick={() => onAdd(column.id)}
      >
        <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar card
      </Button>
    </section>
  );
}
