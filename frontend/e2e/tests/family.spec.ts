import { expect } from '@playwright/test';
import { test, MOCK_USER } from '../fixtures/auth';

const MOCK_FAMILY = {
  id: 'fam-001',
  name: 'Família Silva',
  ownerId: MOCK_USER.id,
  memberCount: 1,
};

/** Helper: configura o mock de /api/families para retornar uma lista de famílias. */
async function mockFamilies(page: import('@playwright/test').Page, families: typeof MOCK_FAMILY[]) {
  await page.route('**/api/families', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ families }),
      });
    } else {
      route.continue();
    }
  });
}

test.describe('Página de Família — sem família', () => {
  test('exibe card de criação quando usuário não tem família', async ({
    authenticatedPage: page,
  }) => {
    await mockFamilies(page, []);

    await page.goto('/dashboard/family');

    // FamilyCreateCard deve aparecer
    await expect(page.getByRole('button', { name: /criar família|criar/i })).toBeVisible({
      timeout: 8000,
    });
  });

  test('cria família com sucesso e exibe toast de confirmação', async ({
    authenticatedPage: page,
  }) => {
    await mockFamilies(page, []);

    // Após criar, retorna a família nova
    await page.route('**/api/families', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ family: MOCK_FAMILY }),
        });
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ families: [] }),
        });
      }
    });

    await page.goto('/dashboard/family');
    await page.getByRole('button', { name: /criar família|criar/i }).first().click();

    await expect(page.getByText('Família pronta', { exact: true })).toBeVisible({
      timeout: 8000,
    });
  });

  test('exibe toast de erro se a criação de família falhar', async ({
    authenticatedPage: page,
  }) => {
    await mockFamilies(page, []);

    await page.route('**/api/families', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Erro interno' }),
        });
      } else {
        route.fulfill({ status: 200, body: JSON.stringify({ families: [] }) });
      }
    });

    await page.goto('/dashboard/family');
    await page.getByRole('button', { name: /criar família|criar/i }).first().click();

    await expect(page.getByText('Erro ao criar família', { exact: true })).toBeVisible({ timeout: 8000 });
  });
});

test.describe('Página de Família — com família', () => {
  test('exibe FamilyHeader com o nome da família', async ({ authenticatedPage: page }) => {
    await mockFamilies(page, [MOCK_FAMILY]);

    // Também precisa de arquivos/pastas para o FileBrowser
    await page.route('**/api/files**', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ files: [], total: 0, page: 1, limit: 50, totalPages: 0 }),
      }),
    );
    await page.route('**/api/folders**', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ folders: [], total: 0, page: 1, limit: 50, totalPages: 0 }),
      }),
    );

    await page.goto('/dashboard/family');

    await expect(page.getByText(MOCK_FAMILY.name, { exact: true })).toBeVisible({ timeout: 8000 });
  });

  test('exibe estado vazio no FileBrowser da família quando não há arquivos', async ({
    authenticatedPage: page,
  }) => {
    await mockFamilies(page, [MOCK_FAMILY]);

    await page.route('**/api/files**', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ files: [], total: 0, page: 1, limit: 50, totalPages: 0 }),
      }),
    );
    await page.route('**/api/folders**', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ folders: [], total: 0, page: 1, limit: 50, totalPages: 0 }),
      }),
    );

    await page.goto('/dashboard/family');

    await expect(page.getByText('Esta pasta está vazia')).toBeVisible({ timeout: 8000 });
  });

  test('exibe arquivos da família quando existem', async ({ authenticatedPage: page }) => {
    await mockFamilies(page, [MOCK_FAMILY]);

    await page.route('**/api/files**', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          files: [
            {
              id: 'file-fam-1',
              name: 'foto-ferias.jpg',
              mimeType: 'image/jpeg',
              size: 204800,
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
    await page.route('**/api/folders**', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ folders: [], total: 0, page: 1, limit: 50, totalPages: 0 }),
      }),
    );

    await page.goto('/dashboard/family');

    await expect(page.getByText('foto-ferias.jpg')).toBeVisible({ timeout: 8000 });
  });
});
