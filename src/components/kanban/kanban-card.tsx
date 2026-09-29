"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CardDTO } from "@/lib/graphql/types";

type Props = {
  card: CardDTO;
  /** A1: false enquanto há filtro ativo — impede drop em índice errado. */
  draggable: boolean;
  onEdit: (card: CardDTO) => void;
  onDelete: (card: CardDTO) => void;
};

export function KanbanCard({ card, draggable, onEdit, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({
      id: card.id,
      data: { type: "card", card },
      disabled: !draggable,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className="group transition-shadow hover:shadow-md">
      <CardContent className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-1">
            {/* Grip explícito: ouvir drag no Card inteiro exigiria role=button
                com botões aninhados dentro — inválido para a11y (e gera nome
                acessível com os rótulos internos embaralhados). */}
            <button
              type="button"
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              aria-label={`Reordenar card ${card.title}`}
              title="Reordenar"
              className={`touch-none rounded p-0.5 text-muted-foreground hover:text-foreground ${
                draggable ? "cursor-grab active:cursor-grabbing" : "cursor-default"
              }`}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
            <p className="text-sm font-medium leading-snug">{card.title}</p>
          </div>
          {/* Ações visíveis no hover (desktop) e sempre acessíveis via foco/toque */}
          <div className="flex shrink-0 gap-0.5 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label={`Editar card ${card.title}`}
              title="Editar"
              onClick={() => onEdit(card)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              aria-label={`Excluir card ${card.title}`}
              title="Excluir"
              onClick={() => onDelete(card)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {card.description && (
          <p className="line-clamp-3 text-xs text-muted-foreground">{card.description}</p>
        )}

        {card.labels.length > 0 && (
          <div className="flex flex-wrap gap-1" aria-label={`Labels: ${card.labels.join(", ")}`}>
            {card.labels.map((label) => (
              <Badge key={label} variant="secondary" className="text-[10px]">
                {label}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
