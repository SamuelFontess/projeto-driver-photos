/**
 * Testes do dashboard autenticado.
 * Cobre: sidebar, header, file browser, perfil e logout.
 */
import { expect } from "@playwright/test";
import { test, MOCK_USER } from "../fixtures/auth";
import { DashboardPage } from "../pages/DashboardPage";

test.describe("Sidebar", () => {
  test("exibe logo, links de navegação e botão de sair", async ({
    authenticatedPage: page,
  }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await expect(dashboard.sidebarLogo).toBeVisible({ timeout: 8000 });
    await expect(dashboard.navDashboard).toBeVisible();
    await expect(dashboard.navFamily).toBeVisible();
    await expect(dashboard.navProfile).toBeVisible();
    await expect(dashboard.logoutButton).toBeVisible();
  });

  test("exibe nome e email do usuário logado", async ({
    authenticatedPage: page,
  }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await expect(page.getByText(MOCK_USER.name, { exact: true })).toBeVisible({
      timeout: 8000,
    });
    await expect(
      page.getByText(MOCK_USER.email, { exact: true }),
    ).toBeVisible();
  });

  test('link "Perfil" navega para /dashboard/profile', async ({
    authenticatedPage: page,
  }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await dashboard.navProfile.click();
    await expect(page).toHaveURL(/\/dashboard\/profile/);
  });

  test('link "Família" navega para /dashboard/family', async ({
    authenticatedPage: page,
  }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await dashboard.navFamily.click();
    await expect(page).toHaveURL(/\/dashboard\/family/);
  });

  test("logout limpa sessão e redireciona para /login", async ({
    authenticatedPage: page,
  }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await dashboard.logout();

    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
  });
});

test.describe("Header e busca", () => {
  test("exibe campo de busca no header", async ({
    authenticatedPage: page,
  }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await expect(dashboard.searchInput).toBeVisible({ timeout: 8000 });
  });

  test("digitar na busca atualiza o campo", async ({
    authenticatedPage: page,
  }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await dashboard.searchInput.fill("documento");
    await expect(dashboard.searchInput).toHaveValue("documento");
  });

  test('exibe breadcrumb "Raiz" por padrão', async ({
    authenticatedPage: page,
  }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await expect(
      page
        .getByRole("navigation", { name: "Localização atual" })
        .getByText("Raiz"),
    ).toBeVisible({ timeout: 8000 });
  });
});

test.describe("File Browser — estado vazio", () => {
  test("exibe mensagem de pasta vazia quando não há arquivos nem pastas", async ({
    authenticatedPage: page,
  }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await expect(dashboard.emptyFolderState).toBeVisible({ timeout: 8000 });
    await expect(
      page.getByText("Arraste arquivos para cá ou use o botão para começar."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Enviar arquivo", exact: true }),
    ).toBeVisible();
  });

  test("exibe saudação personalizada com o nome do usuário", async ({
    authenticatedPage: page,
  }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await expect(page.getByText(`Olá, ${MOCK_USER.name}!`)).toBeVisible({
      timeout: 8000,
    });
  });

  test("botões de toggle de visualização (grid/list) estão presentes", async ({
    authenticatedPage: page,
  }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    // FileActions sempre renderiza os botões de view mode
    await expect(
      page.getByRole("button", { name: "Visualização em grade" }),
    ).toBeVisible({ timeout: 8000 });
    await expect(
      page.getByRole("button", { name: "Visualização em lista" }),
    ).toBeVisible();
  });
});

test.describe("File Browser — com pastas e arquivos", () => {
  test("exibe lista de pastas", async ({ authenticatedPage: page }) => {
    // Sobrescreve mock de folders com dados reais
    await page.route("**/api/folders**", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          folders: [
            {
              id: "f1",
              name: "Documentos",
              parentId: null,
              updatedAt: new Date().toISOString(),
            },
            {
              id: "f2",
              name: "Fotos",
              parentId: null,
              updatedAt: new Date().toISOString(),
            },
          ],
          total: 2,
          page: 1,
          limit: 50,
          totalPages: 1,
        }),
      }),
    );

    await page.goto("/dashboard");

    await expect(page.getByText("Documentos")).toBeVisible({ timeout: 8000 });
    await expect(page.getByText("Fotos")).toBeVisible();
    await expect(page.getByText(/Pastas \(2\)/)).toBeVisible();
  });

  test("exibe lista de arquivos", async ({ authenticatedPage: page }) => {
    await page.route("**/api/files**", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          files: [
            {
              id: "file1",
              name: "relatorio.pdf",
              mimeType: "application/pdf",
              size: 102400,
              folderId: null,
              createdAt: new Date().toISOString(),
            },
          ],
          total: 1,
          page: 1,
          limit: 50,
          totalPages: 1,
        }),
      }),
    );

    await page.goto("/dashboard");

    await expect(page.getByText("relatorio.pdf")).toBeVisible({
      timeout: 8000,
    });
    await expect(page.getByText(/Arquivos \(1\)/)).toBeVisible();
  });
});

test.describe("File Browser — navegação de pastas", () => {
  test("clicar em uma pasta atualiza a URL com folderId", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/folders**", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          folders: [
            {
              id: "folder-nav-1",
              name: "Projetos",
              parentId: null,
              updatedAt: new Date().toISOString(),
            },
          ],
          total: 1,
          page: 1,
          limit: 50,
          totalPages: 1,
        }),
      }),
    );

    await page.goto("/dashboard");

    await page.getByText("Projetos").click();

    await expect(page).toHaveURL(/folderId=folder-nav-1/, { timeout: 8000 });
  });

  test("breadcrumb exibe o nome da pasta ao navegar para dentro", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/folders**", (route) => {
      const url = route.request().url();
      if (url.includes("parentId=folder-nav-2") || url.includes("folderId=folder-nav-2")) {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ folders: [], total: 0, page: 1, limit: 50, totalPages: 0 }),
        });
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            folders: [
              {
                id: "folder-nav-2",
                name: "Documentos Legais",
                parentId: null,
                updatedAt: new Date().toISOString(),
              },
            ],
            total: 1,
            page: 1,
            limit: 50,
            totalPages: 1,
          }),
        });
      }
    });

    await page.goto("/dashboard");
    await page.getByText("Documentos Legais").click();

    await expect(
      page
        .getByRole("navigation", { name: "Localização atual" })
        .getByText("Documentos Legais"),
    ).toBeVisible({ timeout: 8000 });
  });

  test("botão de upload de arquivo está visível", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByRole("button", { name: "Enviar arquivo", exact: true }),
    ).toBeVisible({ timeout: 8000 });
  });
});

test.describe("File Browser — busca", () => {
  test("digitar na busca filtra resultados pelo nome", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/files**", (route) => {
      const url = route.request().url();
      if (url.includes("search=relatorio") || url.includes("q=relatorio")) {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            files: [
              {
                id: "f-search-1",
                name: "relatorio-anual.pdf",
                mimeType: "application/pdf",
                size: 51200,
                folderId: null,
                createdAt: new Date().toISOString(),
              },
            ],
            total: 1,
            page: 1,
            limit: 50,
            totalPages: 1,
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ files: [], total: 0, page: 1, limit: 50, totalPages: 0 }),
        });
      }
    });

    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await dashboard.searchInput.fill("relatorio");
    await page.waitForTimeout(400); // debounce

    await expect(page.getByText("relatorio-anual.pdf")).toBeVisible({ timeout: 8000 });
  });
});

test.describe("Página de Perfil", () => {
  test("exibe formulário com nome e email pré-preenchidos", async ({
    authenticatedPage: page,
  }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.gotoProfile();

    await expect(
      page.getByRole("heading", { name: "Informações pessoais" }),
    ).toBeVisible({ timeout: 8000 });

    const nameInput = page.getByLabel("Nome");
    const emailInput = page.getByLabel("Email");

    await expect(nameInput).toHaveValue(MOCK_USER.name);
    await expect(emailInput).toHaveValue(MOCK_USER.email);
  });

  test('exibe seção de alteração de senha ao clicar em "Alterar senha"', async ({
    authenticatedPage: page,
  }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.gotoProfile();

    await expect(
      page.getByRole("button", { name: "Alterar senha" }),
    ).toBeVisible({ timeout: 8000 });

    // Campos de senha ocultos inicialmente
    await expect(page.getByLabel("Senha atual")).not.toBeVisible();

    await page.getByRole("button", { name: "Alterar senha" }).click();

    await expect(page.getByLabel("Senha atual")).toBeVisible();
    await expect(page.getByLabel("Nova senha", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Confirmar nova senha")).toBeVisible();
  });

  test('"Cancelar" na seção de senha oculta os campos novamente', async ({
    authenticatedPage: page,
  }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.gotoProfile();

    await page.getByRole("button", { name: "Alterar senha" }).click();
    await expect(page.getByLabel("Senha atual")).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: "Cancelar" }).first().click();
    await expect(page.getByLabel("Senha atual")).not.toBeVisible();
  });

  test("salva alterações de perfil com sucesso", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/auth/me", (route) => {
      if (route.request().method() === "PATCH") {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ user: { ...MOCK_USER, name: "Novo Nome" } }),
        });
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ user: MOCK_USER }),
        });
      }
    });

    const dashboard = new DashboardPage(page);
    await dashboard.gotoProfile();

    const nameInput = page.getByLabel("Nome");
    await nameInput.clear();
    await nameInput.fill("Novo Nome");

    await page.getByRole("button", { name: "Salvar alterações" }).click();

    await expect(page.getByText("Perfil atualizado", { exact: true })).toBeVisible({
      timeout: 8000,
    });
  });
});
