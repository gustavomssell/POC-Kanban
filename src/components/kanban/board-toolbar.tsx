"use client";

import { Plus, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  search: string;
  onSearchChange: (v: string) => void;
  allLabels: string[];
  activeLabels: string[];
  onToggleLabel: (l: string) => void;
  onClearFilters: () => void;
  isFiltering: boolean;
  onNewColumn: () => void;
};

/** Barra de busca, filtros por label e ações — separada do board para legibilidade. */
export function BoardToolbar({
  search,
  onSearchChange,
  allLabels,
  activeLabels,
  onToggleLabel,
  onClearFilters,
  isFiltering,
  onNewColumn,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="relative w-full sm:w-64">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          className={`pl-9 ${search ? "pr-9" : ""}`}
          placeholder="Buscar por título ou descrição…"
          aria-label="Buscar cards"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {search && (
          <button
            type="button"
            aria-label="Limpar busca"
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {allLabels.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por label">
          {allLabels.map((label) => {
            const active = activeLabels.includes(label);
            return (
              <Badge
                key={label}
                variant={active ? "default" : "secondary"}
                className="cursor-pointer select-none transition-transform hover:scale-105"
                onClick={() => onToggleLabel(label)}
                aria-pressed={active}
                title={active ? `Remover filtro ${label}` : `Filtrar por ${label}`}
              >
                {label}
              </Badge>
            );
          })}
        </div>
      )}

      {isFiltering && (
        <>
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="mr-1 h-3.5 w-3.5" /> Limpar filtros
          </Button>
          {/* A1: reordenação pausada — o índice do drop não bate com o servidor. */}
          <span className="hidden text-xs text-muted-foreground md:inline">
            Reordenação pausada durante o filtro
          </span>
        </>
      )}

      <div className="ml-auto">
        <Button variant="outline" onClick={onNewColumn}>
          <Plus className="mr-1 h-4 w-4" /> Nova coluna
        </Button>
      </div>
    </div>
  );
}
