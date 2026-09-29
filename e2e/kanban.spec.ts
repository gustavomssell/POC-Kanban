import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Suíte E2E do board — roda contra `kanbanql_test` (reset a cada run via
 * `test:e2e:serve`). Serial por design: todos os testes compartilham o mesmo
 * board e o primeiro deles semeia o banco.
 */
test.describe.serial("board kanban", () => {
  /** Garante o seed (idempotente) e o board visível. */
  async function ensureSeeded(page: Page) {
    await page.goto("/");
    const empty = page.getByText("Board vazio", { exact: true });
    if (await empty.isVisible().catch(() => false)) {
      await page.getByRole("button", { name: "Carregar exemplo" }).click();
    }
    await expect(page.locator('section[aria-label^="Coluna To Do"]')).toBeVisible();
  }

  const column = (page: Page, title: string) =>
    page.locator(`section[aria-label^="Coluna ${title}"]`);

  /** Drag real com mouse: ativa o PointerSensor (distância 6) antes de mirar. */
  async function drag(page: Page, source: Locator, target: Locator) {
    const from = await source.boundingBox();
    const to = await target.boundingBox();
    if (!from || !to) throw boundingBoxError(source, target);
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2 + 24, from.y + from.height / 2, {
      steps: 5,
    });
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 20 });
    await page.mouse.up();
  }

  function boundingBoxError(a: Locator, b: Locator): Error {
    return new Error(`boundingBox ausente: ${JSON.stringify([a, b])}`);
  }

  test("board vazio → carrega exemplo com 3 colunas e 4 cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Board vazio", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Carregar exemplo" }).click();

    await expect(page.locator('section[aria-label="Coluna To Do, 2 cards"]')).toBeVisible();
    await expect(page.locator('section[aria-label="Coluna Doing, 1 cards"]')).toBeVisible();
    await expect(page.locator('section[aria-label="Coluna Done, 1 cards"]')).toBeVisible();
    await expect(page.getByText("Modelar schema GraphQL")).toBeVisible();
    await expect(page.getByText("Montar board com DnD")).toBeVisible();
    await expect(page.getByText("Tema dark/light")).toBeVisible();
    await expect(page.getByText("Subir Postgres via compose")).toBeVisible();
  });

  test("alterna tema dark/light pelo toggle do header", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);

    await page.getByRole("button", { name: "Mudar para tema escuro" }).click();
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);

    await page.getByRole("button", { name: "Mudar para tema claro" }).click();
    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
  });

  test("CRUD de card: validação, criação, edição e exclusão", async ({ page }) => {
    await ensureSeeded(page);
    const todo = column(page, "To Do");

    await todo.getByRole("button", { name: "Adicionar card em To Do" }).click();
    await expect(page.getByRole("heading", { name: "Novo card" })).toBeVisible();

    // Validacao obrigatoria (cliente)
    await page.getByRole("button", { name: "Criar card" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("alert")).toHaveText("O título é obrigatório.");

    // Labels "QA, qa, e2e" devem normalizar para ["qa","e2e"]
    await page.locator("#card-title").fill("QA card e2e");
    await page.locator("#card-labels").fill("QA, qa, e2e");
    await page.getByRole("button", { name: "Criar card" }).click();

    await expect(page.getByRole("heading", { name: "Novo card" })).toBeHidden();
    await expect(todo.getByText("QA card e2e")).toBeVisible();
    await expect(todo.locator('[aria-label="Labels: qa, e2e"]')).toBeVisible();
    await expect(todo).toHaveAttribute("aria-label", "Coluna To Do, 3 cards");

    // exact: o Card (role=button) herda os aria-labels internos no nome acessível.
    await todo.getByRole("button", { name: "Editar card QA card e2e", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Editar card" })).toBeVisible();
    await expect(page.locator("#card-title")).toHaveValue("QA card e2e");
    await page.locator("#card-title").fill("QA card editado");
    await page.getByRole("button", { name: "Salvar alterações" }).click();

    await expect(todo.getByText("QA card editado")).toBeVisible();
    await expect(todo.getByText("QA card e2e")).toHaveCount(0);

    await todo
      .getByRole("button", { name: "Excluir card QA card editado", exact: true })
      .click();
    await expect(page.getByRole("heading", { name: "Excluir card?" })).toBeVisible();
    await expect(dialog.getByText("será removido permanentemente")).toBeVisible();
    await dialog.getByRole("button", { name: "Excluir", exact: true }).click();

    await expect(todo.getByText("QA card editado")).toHaveCount(0);
    await expect(todo).toHaveAttribute("aria-label", "Coluna To Do, 2 cards");
  });

  test("CRUD de coluna: validação, criação, renomeação e exclusão", async ({ page }) => {
    await ensureSeeded(page);
    const dialog = page.getByRole("dialog");

    await page.getByRole("button", { name: "Nova coluna" }).click();
    await expect(page.getByRole("heading", { name: "Nova coluna" })).toBeVisible();

    await page.locator("#column-title").fill("X");
    await page.getByRole("button", { name: "Criar coluna", exact: true }).click();
    await expect(dialog.getByRole("alert")).toHaveText(
      "Dê um nome com pelo menos 2 caracteres."
    );

    await page.locator("#column-title").fill("Coluna E2E");
    await page.getByRole("button", { name: "Criar coluna", exact: true }).click();
    await expect(column(page, "Coluna E2E")).toHaveAttribute(
      "aria-label",
      "Coluna Coluna E2E, 0 cards"
    );

    await page.getByRole("button", { name: "Renomear coluna Coluna E2E" }).click();
    await expect(page.getByRole("heading", { name: "Renomear coluna" })).toBeVisible();
    await expect(page.locator("#column-title")).toHaveValue("Coluna E2E");
    await page.locator("#column-title").fill("Backlog E2E");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(column(page, "Backlog E2E")).toBeVisible();

    await page.getByRole("button", { name: "Excluir coluna Backlog E2E" }).click();
    await expect(page.getByRole("heading", { name: "Excluir coluna?" })).toBeVisible();
    await expect(dialog.getByText("0 card(s)")).toBeVisible();
    await dialog.getByRole("button", { name: "Excluir", exact: true }).click();

    await expect(column(page, "Backlog E2E")).toHaveCount(0);
  });

  test("busca filtra cards, mostra banner de vazio e limpa filtros", async ({ page }) => {
    await ensureSeeded(page);

    await page.getByLabel("Buscar cards").fill("dark");
    await expect(page.locator('section[aria-label="Coluna To Do, 0 cards"]')).toBeVisible();
    await expect(page.locator('section[aria-label="Coluna Doing, 1 cards"]')).toBeVisible();
    await expect(page.getByText("Tema dark/light")).toBeVisible();
    await expect(page.getByText("Modelar schema GraphQL")).toHaveCount(0);
    await expect(page.getByText("Reordenação pausada durante o filtro")).toBeVisible();

    await page.getByLabel("Buscar cards").fill("zzzzzz");
    const banner = page.getByRole("status").filter({
      hasText: "Nenhum card corresponde aos filtros atuais.",
    });
    await expect(banner).toBeVisible();
    await banner.getByRole("button", { name: "Limpar filtros" }).click();

    await expect(page.locator('section[aria-label="Coluna To Do, 2 cards"]')).toBeVisible();
    await expect(page.getByLabel("Buscar cards")).toHaveValue("");
    await expect(banner).toHaveCount(0);
  });

  test("filtra por label e restaura ao limpar", async ({ page }) => {
    await ensureSeeded(page);

    await page.locator('[title="Filtrar por infra"]').click();
    await expect(page.locator('[title="Remover filtro infra"]')).toBeVisible();
    await expect(page.locator('section[aria-label="Coluna Done, 1 cards"]')).toBeVisible();
    await expect(page.locator('section[aria-label="Coluna To Do, 0 cards"]')).toBeVisible();
    await expect(page.getByText("Subir Postgres via compose")).toBeVisible();

    await page
      .getByRole("button", { name: "Limpar filtros" })
      .first()
      .click();
    await expect(page.locator('section[aria-label="Coluna To Do, 2 cards"]')).toBeVisible();
  });

  test("arrasta card de uma coluna para outra (DnD)", async ({ page }) => {
    await ensureSeeded(page);
    const todo = column(page, "To Do");
    const doing = column(page, "Doing");

    await drag(page, todo.getByText("Montar board com DnD"), doing);

    await expect(doing.getByText("Montar board com DnD")).toBeVisible();
    await expect(doing).toHaveAttribute("aria-label", "Coluna Doing, 2 cards");
    await expect(todo).toHaveAttribute("aria-label", "Coluna To Do, 1 cards");
  });

  test("reordena colunas pelo grip (DnD horizontal)", async ({ page }) => {
    await ensureSeeded(page);

    // Soltar sobre a última coluna: "To Do" sai do índice 0 e nada se perde.
    await drag(
      page,
      page.getByRole("button", { name: "Reordenar coluna To Do" }),
      column(page, "Done")
    );

    const sections = page.locator("section[aria-label^='Coluna ']");
    await expect(sections).toHaveCount(3);
    await expect(sections.first()).toHaveAttribute("aria-label", /^Coluna (Doing|Done)/);
    await expect(page.getByText("Modelar schema GraphQL")).toBeVisible();
    await expect(page.getByText("Montar board com DnD")).toBeVisible();
  });
});
