import { test as base, Page } from "@playwright/test";

const MOCK_USER = {
  id: "user-mock-id-001",
  email: "test@driver.com",
  name: "Test User",
  isAdmin: false,
};

const MOCK_TOKEN = "mock-jwt-token-for-e2e-tests";

/** Injeta token no localStorage e mocka todos os endpoints necessários para o dashboard funcionar. */
export async function setupAuthenticatedState(page: Page) {
  // 1. Token no localStorage antes do bootstrap do AuthContext
  await page.addInitScript((token) => {
    localStorage.setItem("token", token);
  }, MOCK_TOKEN);

  // 2. Mock GET /api/auth/me → usuário autenticado
  await page.route("**/api/auth/me", (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: MOCK_USER }),
      });
    } else {
      route.continue();
    }
  });

  // 3. Mock GET /api/folders → lista vazia
  await page.route("**/api/folders**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        folders: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
      }),
    });
  });

  // 4. Mock GET /api/files → lista vazia
  await page.route("**/api/files**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        files: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
      }),
    });
  });
}

/** Garante que o endpoint getMe retorna 401 (usuário não autenticado). */
export async function setupUnauthenticatedState(page: Page) {
  await page.route("**/api/auth/me", (route) => {
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "Unauthorized" }),
    });
  });
}

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await setupAuthenticatedState(page);
    await use(page);
  },
});

export { MOCK_USER, MOCK_TOKEN };
