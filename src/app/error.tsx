"use client";

import { Button } from "@/components/ui/button";
import { TriangleAlert } from "lucide-react";

/** Error boundary da rota — captura erros de render inesperados. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <TriangleAlert className="h-8 w-8 text-destructive" aria-hidden="true" />
      <div className="space-y-1">
        <h1 className="text-base font-semibold">Algo deu errado</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {error.message || "Erro inesperado."}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  );
}
