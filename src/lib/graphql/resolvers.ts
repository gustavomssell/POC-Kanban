import { prisma } from "@/lib/prisma";

function buildCardWhere(search?: string | null, labels?: string[] | null) {
  const AND: Record<string, unknown>[] = [];
  if (search) {
    AND.push({
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    });
  }
  if (labels && labels.length > 0) {
    AND.push({ labels: { hasSome: labels } });
  }
  return AND.length > 0 ? { AND } : {};
}

/** A8: validação no servidor — o cliente pode ser contornado via GraphiQL. */
function requireTitle(value: unknown): string {
  const title = typeof value === "string" ? value.trim() : "";
  if (!title) throw new Error("Título é obrigatório e não pode ser vazio.");
  return title;
}

function normalizeLabels(labels: string[] | null | undefined): string[] {
  if (!labels) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of labels) {
    const label = raw.trim().toLowerCase();
    if (label && !seen.has(label)) {
      seen.add(label);
      out.push(label);
    }
  }
  return out;
}

 // eslint-disable-next-line @typescript-eslint/no-explicit-any
export const resolvers: any = {
  Query: {
    columns: () =>
      prisma.column.findMany({
        orderBy: { order: "asc" },
        include: { cards: { orderBy: { order: "asc" } } },
      }),
    cards: (_: unknown, args: { search?: string; labels?: string[] }) =>
      prisma.card.findMany({
        where: buildCardWhere(args.search, args.labels),
        orderBy: [{ columnId: "asc" }, { order: "asc" }],
        include: { column: true },
      }),
    card: (_: unknown, args: { id: string }) =>
      prisma.card.findUnique({
        where: { id: args.id },
        include: { column: true },
      }),
    labels: async () => {
      const cards = await prisma.card.findMany({ select: { labels: true } });
      return Array.from(new Set(cards.flatMap((c: { labels: string[] }) => c.labels))).sort();
    },
  },
  Column: {
    cards: (
      parent: { id: string },
      args: { search?: string; labels?: string[] }
    ) =>
      prisma.card.findMany({
        where: { columnId: parent.id, ...buildCardWhere(args.search, args.labels) },
        orderBy: { order: "asc" },
      }),
  },
  Mutation: {
    createColumn: async (_: unknown, args: { input: { title: string } }) => {
      const title = requireTitle(args.input?.title);
      const count = await prisma.column.count();
      return prisma.column.create({
        data: { title, order: count },
      });
    },
    renameColumn: (_: unknown, args: { id: string; title: string }) =>
      prisma.column.update({
        where: { id: args.id },
        data: { title: requireTitle(args.title) },
      }),
    moveColumn: async (_: unknown, args: { id: string; order: number }) => {
      await prisma.column.findUniqueOrThrow({ where: { id: args.id } });
      const siblings = await prisma.column.findMany({
        orderBy: { order: "asc" },
        select: { id: true },
      });
      const filtered = siblings.filter((c) => c.id !== args.id);
      const insertAt = Math.max(0, Math.min(args.order, filtered.length));
      const ordered: { id: string }[] = [
        ...filtered.slice(0, insertAt),
        { id: args.id },
        ...filtered.slice(insertAt),
      ];
      await prisma.$transaction(
        ordered.map((c, i) => prisma.column.update({ where: { id: c.id }, data: { order: i } }))
      );
      return prisma.column.findUniqueOrThrow({
        where: { id: args.id },
        include: { cards: { orderBy: { order: "asc" } } },
      });
    },
    deleteColumn: async (_: unknown, args: { id: string }) => {
      await prisma.column.delete({ where: { id: args.id } });
      return true;
    },
    createCard: async (
      _: unknown,
      args: {
        input: {
          title: string;
          description?: string;
          columnId: string;
          labels?: string[];
        };
      }
    ) => {
      const title = requireTitle(args.input?.title);
      const count = await prisma.card.count({
        where: { columnId: args.input.columnId },
      });
      return prisma.card.create({
        data: {
          title,
          description: args.input.description?.trim() || null,
          columnId: args.input.columnId,
          labels: normalizeLabels(args.input.labels),
          order: count,
        },
        include: { column: true },
      });
    },
    // Atualiza conteúdo (título/descrição/labels). Posição é papel do `moveCard`.
    updateCard: (
      _: unknown,
      args: {
        id: string;
        input: {
          title?: string;
          description?: string;
          labels?: string[];
        };
      }
    ) =>
      prisma.card.update({
        where: { id: args.id },
        data: {
          ...(args.input.title !== undefined ? { title: requireTitle(args.input.title) } : {}),
          ...(args.input.description !== undefined
            ? { description: args.input.description.trim() || null }
            : {}),
          ...(args.input.labels !== undefined
            ? { labels: normalizeLabels(args.input.labels) }
            : {}),
        },
        include: { column: true },
      }),
    moveCard: async (
      _: unknown,
      args: { id: string; columnId: string; order: number }
    ) => {
      // Valida o destino antes de tocar no banco.
      await prisma.column.findUniqueOrThrow({ where: { id: args.columnId } });
      const card = await prisma.card.findUniqueOrThrow({ where: { id: args.id } });

      type Sibling = { id: string };

      if (card.columnId !== args.columnId) {
        const [siblingsOld, siblingsNew] = await Promise.all([
          prisma.card.findMany({
            where: { columnId: card.columnId, id: { not: card.id } },
            orderBy: { order: "asc" },
            select: { id: true },
          }),
          prisma.card.findMany({
            where: { columnId: args.columnId },
            orderBy: { order: "asc" },
            select: { id: true },
          }),
        ]);
        const insertAt = Math.max(0, Math.min(args.order, siblingsNew.length));
        const orderedNew: Sibling[] = [
          ...siblingsNew.slice(0, insertAt),
          { id: card.id },
          ...siblingsNew.slice(insertAt),
        ];

        await prisma.$transaction([
          ...siblingsOld.map((c, i) =>
            prisma.card.update({ where: { id: c.id }, data: { order: i } })
          ),
          ...orderedNew.map((c, i) =>
            c.id === card.id
              ? prisma.card.update({
                  where: { id: c.id },
                  data: { columnId: args.columnId, order: i },
                })
              : prisma.card.update({ where: { id: c.id }, data: { order: i } })
          ),
        ]);
      } else {
        const siblings: Sibling[] = await prisma.card.findMany({
          where: { columnId: card.columnId },
          orderBy: { order: "asc" },
          select: { id: true },
        });
        const filtered = siblings.filter((c) => c.id !== card.id);
        const insertAt = Math.max(0, Math.min(args.order, filtered.length));
        const ordered: Sibling[] = [
          ...filtered.slice(0, insertAt),
          { id: card.id },
          ...filtered.slice(insertAt),
        ];

        await prisma.$transaction(
          ordered.map((c, i) => prisma.card.update({ where: { id: c.id }, data: { order: i } }))
        );
      }

      return prisma.card.findUniqueOrThrow({
        where: { id: args.id },
        include: { column: true },
      });
    },
    deleteCard: async (_: unknown, args: { id: string }) => {
      await prisma.card.delete({ where: { id: args.id } });
      return true;
    },
    seed: async () => {
      const existing = await prisma.column.count();
      if (existing > 0) return true;
      const todo = await prisma.column.create({
        data: { title: "To Do", order: 0 },
      });
      const doing = await prisma.column.create({
        data: { title: "Doing", order: 1 },
      });
      const done = await prisma.column.create({
        data: { title: "Done", order: 2 },
      });
      await prisma.card.createMany({
        data: [
          {
            title: "Modelar schema GraphQL",
            description: "Definir Column, Card, queries e mutations da POC",
            columnId: todo.id,
            order: 0,
            labels: ["backend", "graphql"],
          },
          {
            title: "Montar board com DnD",
            description: "Usar dnd-kit + Apollo Client",
            columnId: todo.id,
            order: 1,
            labels: ["frontend"],
          },
          {
            title: "Tema dark/light",
            description: "shadcn + next-themes com toggle no header",
            columnId: doing.id,
            order: 0,
            labels: ["frontend", "ui"],
          },
          {
            title: "Subir Postgres via compose",
            description: "docker compose up -d db",
            columnId: done.id,
            order: 0,
            labels: ["infra"],
          },
        ],
      });
      return true;
    },
  },
};
