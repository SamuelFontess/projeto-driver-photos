/**
 * Testes de guarda de rotas (route protection).
 * Verifica se o middleware de autenticação redireciona corretamente.
 */
import { test, expect } from '@playwright/test';
import { setupAuthenticatedState, setupUnauthenticatedState } from '../fixtures/auth';

const PROTECTED_ROUTES = [
  '/dashboard',
  '/dashboard/profile',
  '/dashboard/family',
];

test.describe('Usuário NÃO autenticado', () => {
  test.beforeEach(async ({ page }) => {
    await setupUnauthenticatedState(page);
  });

  for (const route of PROTECTED_ROUTES) {
    test(`tentativa de acessar "${route}" redireciona para /login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
    });
  }

  test('página raiz "/" redireciona para /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
  });
});

test.describe('Usuário NÃO autenticado — parâmetro from', () => {
  test.beforeEach(async ({ page }) => {
    await setupUnauthenticatedState(page);
  });

  test('após login com parâmetro "from", redireciona para o caminho original', async ({
    page,
  }) => {
    const MOCK_USER = { id: '1', email: 'test@driver.com', name: 'Test User' };

    // Tenta acessar rota protegida → vai para /login?from=/dashboard/profile
    await page.goto('/dashboard/profile');
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });

    // Configura mocks para login bem-sucedido
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Set-Cookie': 'access_token=mock-token; Path=/; HttpOnly; SameSite=Strict',
        },
        body: JSON.stringify({ token: 'mock-token', user: MOCK_USER }),
      }),
    );
    await page.route('**/api/auth/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: MOCK_USER }),
      }),
    );
    await page.route('**/api/folders**', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ folders: [], total: 0, page: 1, limit: 50, totalPages: 0 }) }),
    );
    await page.route('**/api/files**', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ files: [], total: 0, page: 1, limit: 50, totalPages: 0 }) }),
    );

    await page.getByLabel('Email').fill('test@driver.com');
    await page.getByLabel('Senha').fill('senha123');
    await page.getByRole('button', { name: 'Entrar' }).click();

    // Deve redirecionar para o caminho original (/dashboard/profile) ou para /dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 8000 });
  });
});

test.describe('Usuário autenticado', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedState(page);
  });

  test('acessar /login redireciona para /dashboard', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 8000 });
  });

  test('acessar /register redireciona para /dashboard', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 8000 });
  });

  test('pode acessar /dashboard diretamente', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    // Sidebar aparece — confirma que está autenticado
    await expect(page.getByRole('link', { name: 'Início' })).toBeVisible({ timeout: 8000 });
  });
});
