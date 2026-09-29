"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Pencil, Trash2 } from "lucide-react";
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
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
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group touch-manipulation transition-shadow hover:shadow-md ${
        draggable ? "cursor-grab active:cursor-grabbing" : "cursor-default"
      }`}
    >
      <CardContent className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug">{card.title}</p>
          {/* Ações visíveis no hover (desktop) e sempre acessíveis via foco/toque */}
          <div
            className="flex shrink-0 gap-0.5 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
            onPointerDown={(e) => e.stopPropagation()}
          >
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
