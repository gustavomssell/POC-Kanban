import { KanbanBoard } from "@/components/kanban";
import { ThemeToggle } from "@/components/theme-toggle";
import { KanbanSquare } from "lucide-react";

export default function Home() {
  return (
    <div className="flex h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] items-center gap-3 px-4 py-3 sm:px-6">
          <div
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"
          >
            <KanbanSquare className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold leading-tight sm:text-lg">
              POC KanbanQL
            </h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Next.js + GraphQL + Postgres + shadcn
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <a
              href="/api/graphql"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              GraphiQL
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1600px] min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6 sm:py-6">
        <KanbanBoard />
      </main>
    </div>
  );
}
