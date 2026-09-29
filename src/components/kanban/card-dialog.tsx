"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import type { CardDTO, CardFormData } from "@/lib/graphql/types";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Card em edição; `null` = criação. */
  initial?: CardDTO | null;
  defaultColumnId?: string;
  columns: { id: string; title: string }[];
  onSubmit: (data: CardFormData) => Promise<boolean>;
};

const inputLabel = "text-sm font-medium";

/**
 * Formulário de card. O componente é remontado via `key` a cada abertura
 * (ver KanbanBoard), então o estado inicial deriva direto das props —
 * sem efeito de sincronização e sem valores "vazados" entre edições.
 */
export function CardDialog({ open, onOpenChange, initial, defaultColumnId, columns, onSubmit }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [labels, setLabels] = useState((initial?.labels ?? []).join(", "));
  const [columnId, setColumnId] = useState(
    initial?.columnId ?? defaultColumnId ?? columns[0]?.id ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("O título é obrigatório.");
      return;
    }
    if (!initial && !columnId) {
      setError("Escolha a coluna do card.");
      return;
    }
    setSaving(true);
    const ok = await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      labels: labels
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i),
      columnId: initial?.columnId ?? columnId,
    });
    setSaving(false);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar card" : "Novo card"}</DialogTitle>
          <DialogDescription>
            {initial
              ? "Atualize título, descrição e labels do card."
              : "Descreva a tarefa e classifique com labels."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="card-title" className={inputLabel}>
              Título <span aria-hidden="true" className="text-destructive">*</span>
            </label>
            <Input
              id="card-title"
              placeholder="Ex.: Implementar login com OAuth"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError(null);
              }}
              maxLength={120}
              autoFocus
              aria-invalid={error ? true : undefined}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="card-description" className={inputLabel}>
              Descrição
            </label>
            <Textarea
              id="card-description"
              placeholder="Contexto, critérios de aceite, links…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="card-labels" className={inputLabel}>
              Labels
            </label>
            <Input
              id="card-labels"
              placeholder="frontend, bug, urgente (separadas por vírgula)"
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Servem para filtrar o board na barra de busca.
            </p>
          </div>

          {!initial && (
            <div className="space-y-1.5">
              <label htmlFor="card-column" className={inputLabel}>
                Coluna
              </label>
              <select
                id="card-column"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando…" : initial ? "Salvar alterações" : "Criar card"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
