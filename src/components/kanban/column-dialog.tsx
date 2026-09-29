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
import { Input } from "@/components/ui/input";

/** Criação/renomeação de coluna com validação — substitui o `prompt()` nativo.
 *  Modo renomear: montado com `columnId` + `initialTitle` (remontado a cada
 *  abertura pelo KanbanBoard, então o estado começa fresco). */
export function ColumnDialog({
  open,
  onOpenChange,
  columnId,
  initialTitle,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  columnId?: string;
  initialTitle?: string;
  onSubmit: (title: string) => Promise<boolean>;
}) {
  const isRename = columnId !== undefined;
  const [title, setTitle] = useState(initialTitle ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = title.trim();
    if (value.length < 2) {
      setError("Dê um nome com pelo menos 2 caracteres.");
      return;
    }
    setSaving(true);
    const ok = await onSubmit(value);
    setSaving(false);
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isRename ? "Renomear coluna" : "Nova coluna"}</DialogTitle>
          <DialogDescription>
            {isRename ? "Escolha um novo nome para a coluna." : "Ex.: “Em revisão”, “Bloqueado”, “Backlog”."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="column-title" className="text-sm font-medium">
              Nome da coluna
            </label>
            <Input
              id="column-title"
              placeholder="Ex.: Em revisão"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError(null);
              }}
              maxLength={60}
              autoFocus
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "column-title-error" : undefined}
            />
            {error && (
              <p id="column-title-error" role="alert" className="text-xs text-destructive">
                {error}
              </p>
            )}
          </div>
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
              {saving
                ? isRename
                  ? "Salvando…"
                  : "Criando…"
                : isRename
                  ? "Salvar"
                  : "Criar coluna"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
