# POC KanbanQL

POC de Kanban completo: **Next.js 16 (App Router) + GraphQL integrada + Postgres**, frontend em **Tailwind v4 + shadcn** com tema **dark/light**, drag-and-drop com `@dnd-kit`.

> **Escopo da POC:** validar um board Kanban real (DnD, CRUD completo, filtros) com GraphQL servindo direto do Next.js — sem backend separado. **Fora de escopo:** auth, realtime/subscriptions, multi-tenant.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend | Next.js 16 (App Router) · React 19 · TypeScript |
| Estilo | Tailwind CSS v4 · shadcn/ui (new-york, neutral) · Radix · lucide-react |
| GraphQL | `graphql-yoga` + `@graphql-tools/schema` em `/api/graphql` (Route Handler) |
| Client | Apollo Client v4 (`@apollo/client/react`) |
| Dados | PostgreSQL 16 (Docker Compose, porta **5437**) + Prisma 6 |
| DnD | `@dnd-kit/core` + `@dnd-kit/sortable` (mouse e teclado) |
| Tema/UX | `next-themes` · `sonner` (toasts) |

## Início rápido

Pré-requisitos: Node 24+ e Docker em execução.

```bash
npm install             # inclui prisma generate (postinstall)
cp .env.example .env    # DATABASE_URL aponta para localhost:5437
npm run db:up           # sobe Postgres (5432/5433 ocupados na máquina)
npm run prisma:migrate  # cria as tabelas
npm run dev             # http://localhost:3000
```

- **GraphiQL:** http://localhost:3000/api/graphql
- **Board vazio:** o estado inicial oferece **“Carregar dados exemplo”** (mutation `seed`).

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` / `build` / `start` / `lint` | Dev server · build de produção · server prod · ESLint |
| `npm test` / `test:watch` | Vitest: unit + integração (`pretest` recria o banco de teste) |
| `npm run test:e2e` | Playwright E2E: server próprio na porta 3100 com `kanbanql_test` |
| `npm run test:setup` | Só prepara o banco de teste (`kanbanql_test`) |
| `npm run db:up` / `db:down` | Sobe/derruba o Postgres via Docker Compose |
| `npm run prisma:migrate` | `prisma migrate dev` (cria/aplica migrations) |
| `npm run prisma:studio` / `prisma:generate` | GUI do banco · regenera o client |

## Funcionalidades

- Board com colunas ilimitadas: **criar, renomear (grip), excluir** (com confirmação) e **reordenar colunas** via drag no grip
- Cards: **criar, editar, excluir** (título, descrição, labels) — DnD entre colunas e reordenação (mouse + teclado)
- **Validação em 2 camadas:** dialogs no cliente + `requireTitle`/`normalizeLabels` no servidor (GraphiQL incluído)
- **Busca com debounce + filtro por labels** (server-side); durante filtro a reordenação fica pausada (`reorderLocked`) para o índice do drop não divergir do servidor
- Card salvo que ficaria **escondido pelo filtro** limpa os filtros automaticamente
- UX: skeleton sem flicker (`previousData`), banner “nenhum card corresponde aos filtros”, empty/error states, toasts, tema dark/light
- Otimismo em movimentos (`moveCard`/`moveColumn`) — aplica localmente e confirma com refetch

## Arquitetura

```
componentes (kanban/*)  ──ações──▶  use-board (hook único de dados)
                                       │  filtros: search debounced + labels
                                       │  otimismo: applyMove / applyColumnMove
                                       ▼
                              Apollo Client (cache-and-network)
                                       │  POST /api/graphql
                                       ▼
                        graphql-yoga ─▶ resolvers ─▶ Prisma ─▶ Postgres
```

Decisões que valem destacar:

- **`use-board` é a única fonte de dados** — componentes nunca chamam Apollo diretamente.
- **Otimismo espelha o servidor:** `applyMove`/`applyColumnMove` em `src/lib/board.ts` executam o mesmo algoritmo dos resolvers; a otimização é limpa por identidade (`prev === next`) após o refetch.
- **Filtros vivem nas variáveis da query** — trocar filtro muda as variáveis; `previousData` mantém o dado anterior na tela (sem skeleton piscando) e erro só substitui o board quando não há nenhum dado.
- **GraphQL integrada:** um único Route Handler serve API + GraphiQL, sem processo separado.

## API GraphQL

**Modelo**

- `Column { id, title, order, cards(search, labels) }`
- `Card { id, title, description, order, labels[], columnId, createdAt, updatedAt }`

**Queries:** `columns` · `cards(search, labels)` · `card(id)` · `labels`
**Mutations:** `createColumn` · `renameColumn` · `moveColumn` · `deleteColumn` · `createCard` · `updateCard` · `moveCard` · `deleteCard` · `seed`

## Estrutura do projeto

```
src/
├── app/
│   ├── page.tsx              # shell da página (h-dvh)
│   ├── error.tsx             # error boundary da rota
│   └── api/graphql/route.ts  # graphql-yoga (POST/GET/OPTIONS)
├── components/
│   ├── kanban/               # board, coluna, card, dialogs, toolbar, estados
│   └── ui/                   # primitivos shadcn (button, dialog, input…)
├── hooks/
│   ├── use-board.ts          # dados + mutations + filtros (fonte única)
│   └── use-debounce.ts
└── lib/
    ├── board.ts              # regras de movimento/filtro (puras)
    ├── graphql/              # schema, resolvers, operations, types
    ├── prisma.ts
    └── apollo-client.ts
prisma/                       # schema.prisma + migrations
docker-compose.yml            # Postgres na porta 5437
.github/workflows/ci.yml      # lint + tsc + build
```

## Testes (QA)

```bash
npm test        # unit + integração (~2 s); roda test:setup antes (hook pretest)
```

- **Unitários** (`src/lib/board.test.ts`): `applyMove`/`applyColumnMove` (mesmo algoritmo dos resolvers), `cardMatchesFilters`, `countCards`.
- **Integração** (`src/lib/graphql/resolvers.test.ts`): resolvers chamados direto contra o Postgres — validação de título, normalização de labels, CRUD de colunas, `moveCard`/`moveColumn`, busca/labels e cascade do `deleteColumn`.
- **Isolamento:** os testes rodam sempre em `kanbanql_test` (recriada a cada `npm test`); `vitest.setup.ts` trava o `DATABASE_URL` antes de qualquer import — o banco de dev (`kanbanql`) nunca é tocado.
- O CI roda `npm test` com um serviço Postgres.

### E2E (Playwright)

```bash
npm run test:e2e   # 8 testes em ~1,5 min (inclui build de produção)
```

- `e2e/kanban.spec.ts` (serial): seed do board vazio, tema dark/light, CRUD de card e coluna com validação de formulário, busca com banner "nenhum resultado", filtro por label e DnD (card entre colunas + reordenação de colunas pelo grip).
- **Isolamento:** o `webServer` do Playwright sobe `next build` + `next start` na porta **3100** com `DATABASE_URL` do `kanbanql_test` e recria o banco a cada run — o dev server na 3000 pode continuar rodando em paralelo.
- Cada run refaz o build (~40 s a mais). Unit (`npm test`) e E2E compartilham o banco de teste: não rode os dois ao mesmo tempo.
- Gravações de falha: `npx playwright show-trace test-results/...` (trace + screenshot sob `test-results/`, ignorados pelo git).

## Validação

Antes de qualquer commit:

```bash
npx tsc --noEmit   # tipos
npm run lint       # ESLint
npm test           # unit + integração
npm run build      # build de produção
npm run test:e2e   # E2E (obrigatório quando muda código de UI)
```

O CI (`.github/workflows/ci.yml`) roda os mesmos passos.

## Git flow

- `main` — estado validado (release)
- `develop` — integração
- `feature/*` — branches de feature a partir de `develop`, merge com `--no-ff`
- Mensagens em [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`)

## Contexto para agentes

`AGENTS.md` contém comandos, convenções e gotchas do projeto (o bloco de regras do Next.js é gerenciado por `next dev`). `CLAUDE.md` apenas o importa (`@AGENTS.md`).
