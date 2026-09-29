<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Contexto do projeto — POC KanbanQL

POC de board Kanban com GraphQL integrada ao Next.js. Escopo validado: DnD completo, CRUD de cards/colunas, filtros server-side, tema dark/light. **Fora de escopo:** auth, subscriptions/realtime, multi-tenant.

## Comandos essenciais

| Ação | Comando |
| --- | --- |
| Dev server (porta 3000) | `npm run dev` |
| **Validação antes de commit** | `npx tsc --noEmit && npm run lint && npm test && npm run build` |
| Testes (Vitest) | `npm test` (hook `pretest` recria o banco de teste) · `npm run test:watch` |
| Testes E2E (Playwright) | `npm run test:e2e` (porta 3100, `kanbanql_test`, build incluso; ver `e2e/kanban.spec.ts`) |
| Subir/derrubar Postgres | `npm run db:up` / `npm run db:down` |
| Migrations | `npm run prisma:migrate` |
| Smoke test GraphQL | `POST http://localhost:3000/api/graphql` com body `{"query":"…"}` |

GraphiQL: http://localhost:3000/api/graphql

## Arquitetura (o que não é óbvio pelo código)

- **`src/hooks/use-board.ts` é a única fonte de dados.** Componentes não importam Apollo — toda mutation/query passa por ele, com toast de feedback e refetch centralizado.
- **Otimismo espelha o servidor.** `applyMove`/`applyColumnMove` (`src/lib/board.ts`) copiam o algoritmo exato dos resolvers `moveCard`/`moveColumn`. A otimização é removida por **identidade** (`prev === next ? null : prev`) — não "limpe" isso em sequências de moves.
- **Filtros = variáveis da query** (`search` com debounce de 350 ms + `labels`). Consequências intencionais:
  - `data ?? previousData` mantém o dado anterior durante a troca (sem skeleton piscando);
  - `error` só aparece quando `!query.data` (refetch falho com cache não esconde o board);
  - `reorderLocked` bloqueia drag de cards com filtro/fetch ativo — o índice do drop seria calculado numa lista filtrada e o servidor insere na lista completa (bug de dado corrompido).
- **Card salvo com filtro que o esconderia → `clearFilters()`** (mudança de variáveis faz o Apollo refetchar sozinho). Mesmo raciocínio no `seed`.
- **Validação em 2 camadas:** dialogs no cliente + `requireTitle`/`normalizeLabels` no servidor (`src/lib/graphql/resolvers.ts`). O servidor é a autoridade (GraphiQL pode contornar o cliente). `maskedErrors: false` no Yoga para as mensagens chegarem íntegas ao toast.
- **DnD com contexts aninhados:** colunas = `SortableContext` horizontal; cards = vertical dentro de cada coluna. O dnd-kit só aplica transform se `activeIndex`/`overIndex` forem válidos **naquele contexto** (`sortable.cjs.development.js:514`), então arrastar card não desloca colunas e vice-versa. O activator da coluna (attributes/listeners) fica no **grip**, não no header inteiro.
- **Diálogos montados condicionalmente** (`{open && <Dialog …/>}`) e **fora** do switch loading/erro — estado fresco a cada abertura, sem chaves duplicadas, e a toolbar nunca fica com botão "morte".

## Convenções

- Textos de UI em **pt-BR**; identificadores e código em inglês.
- Comentários só em decisões não-óbvias (por que, não o quê); JSDoc curto em helpers públicos.
- Componentes client com `"use client"`; barrel em `src/components/kanban/index.ts`.
- Alterações de dados = arquivo em `src/lib/graphql/` (schema → resolvers → operations → types) + `use-board`.

## Gotchas

- **Porta do Postgres é 5437** (5432/5433 ocupados na máquina) — `docker-compose.yml` e `.env`.
- **Testes usam `kanbanql_test`**, nunca o banco de dev: `vitest.setup.ts` trava o `DATABASE_URL` antes de qualquer import e o `pretest` recria/migra o banco. Ao adicionar teste, respeitar esse isolamento (não setar DATABASE_URL dentro de teste).
- **E2E usa a porta 3100** (`playwright.config.ts` → `test:e2e:serve` = reset do banco + `next build` + `next start`), com `DATABASE_URL` do `kanbanql_test` via env do webServer — pode rodar junto do dev na 3000 (`next start` não disputa `.next/dev`; um segundo `next dev` no mesmo diretório seria barrado). Unit e E2E compartilham o banco de teste: nunca rode os dois ao mesmo tempo.
- `dev.log` e `.env` são ignorados; `.env.example` é versionado (un-ignore `!.env.example` já no `.gitignore`).
- ESLint `react-hooks` novo reprova `setState` síncrono em efeito — usar `useSyncExternalStore` (ver `ThemeToggle`).
- Apollo Client v4: hooks vêm de `@apollo/client/react`, `gql` da raiz de `@apollo/client`.
- Tailwind v4 sem `tailwind.config` (CSS-first via `@theme`); shadcn instalado manualmente (new-york, neutral).
- **Não editar** o bloco entre `<!-- BEGIN:nextjs-agent-rules -->` e `<!-- END:… -->` neste arquivo — é re-gerado por `next dev`. Conteúdo fora dos markers é preservado.

## Git flow

- `main` (release validado) · `develop` (integração) · `feature/*` a partir de `develop`, merge `--no-ff`.
- Conventional Commits: `feat:` · `fix:` · `docs:` · `chore:` (escopo opcional, ex.: `feat(kanban):`).
- Validar (`tsc` + `lint` + `build`) antes de commitar; nunca commitar `.env`/`dev.log`.
