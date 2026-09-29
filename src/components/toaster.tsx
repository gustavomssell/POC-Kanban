"use client";

import { useTheme } from "next-themes";
import { Toaster as SonnerToaster } from "sonner";

/** Toaster que acompanha o tema claro/escuro da app. */
export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <SonnerToaster
      richColors
      closeButton
      position="bottom-right"
      theme={(resolvedTheme as "light" | "dark" | "system" | undefined) ?? "system"}
    />
  );
}
