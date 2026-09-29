"use client";

import { KanbanSquare, SearchX, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Skeletons exibidos no carregamento inicial do board. */
export function BoardSkeleton() {
  return (
    <div className="flex flex-1 gap-4 overflow-hidden pb-4" aria-label="Carregando board">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex w-80 shrink-0 flex-col gap-2 rounded-xl border bg-muted/40 p-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-5/6" />
        </div>
      ))}
    </div>
  );
}

/** Estado de erro com ação de retry. */
export function BoardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-10 text-center">
      <TriangleAlert className="h-8 w-8 text-destructive" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-sm font-semibold">Não foi possível carregar o board</p>
        <p className="max-w-md text-xs text-muted-foreground">
          {message} Verifique se o Postgres está no ar (`npm run db:up`) e as migrations aplicadas
          (`npx prisma migrate dev`).
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  );
}

/** Board vazio (sem colunas) com CTAs. */
export function BoardEmpty({
  isFiltering,
  onClearFilters,
  onSeed,
  seeding,
  onNewColumn,
}: {
  isFiltering: boolean;
  onClearFilters: () => void;
  onSeed: () => void;
  seeding: boolean;
  onNewColumn: () => void;
}) {
  if (isFiltering) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-10 text-center">
        <SearchX className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-semibold">Nenhum card encontrado</p>
          <p className="text-xs text-muted-foreground">
            Ajuste a busca ou remova os filtros de label.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onClearFilters}>
          Limpar filtros
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-10 text-center">
      <KanbanSquare className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-sm font-semibold">Board vazio</p>
        <p className="text-xs text-muted-foreground">
          Carregue os dados de exemplo ou crie sua primeira coluna.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onSeed} disabled={seeding}>
          {seeding ? "Carregando…" : "Carregar exemplo"}
        </Button>
        <Button size="sm" onClick={onNewColumn}>
          Criar coluna
        </Button>
      </div>
    </div>
  );
}
