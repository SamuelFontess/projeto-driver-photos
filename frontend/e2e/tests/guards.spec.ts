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
