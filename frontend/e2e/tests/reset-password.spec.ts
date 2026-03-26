import { test, expect } from '@playwright/test';
import { setupUnauthenticatedState } from '../fixtures/auth';

test.describe('Redefinição de senha', () => {
  test.beforeEach(async ({ page }) => {
    await setupUnauthenticatedState(page);
  });

  test('exibe formulário com dois campos quando token está presente', async ({ page }) => {
    await page.goto('/reset-password?token=valid-token-abc');

    await expect(page.getByRole('heading', { name: 'Redefinir senha' })).toBeVisible();
    await expect(page.getByLabel('Nova senha')).toBeVisible();
    await expect(page.getByLabel('Confirmar senha')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Redefinir senha' })).toBeEnabled();
  });

  test('exibe mensagem de link inválido e botão desabilitado quando token está ausente', async ({
    page,
  }) => {
    await page.goto('/reset-password');

    await expect(
      page.getByText('Link inválido: token de redefinição ausente.'),
    ).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: 'Redefinir senha' })).toBeDisabled();
  });

  test('redefine senha com sucesso e redireciona para /login', async ({ page }) => {
    await page.goto('/reset-password?token=valid-token-abc');

    await page.route('**/api/auth/reset-password', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Senha redefinida.' }),
      }),
    );

    await page.getByLabel('Nova senha').fill('novaSenha123');
    await page.getByLabel('Confirmar senha').fill('novaSenha123');
    await page.getByRole('button', { name: 'Redefinir senha' }).click();

    await expect(page.getByText('Senha redefinida', { exact: true })).toBeVisible({ timeout: 8000 });
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
  });

  test('exibe toast de erro quando o token for expirado ou inválido', async ({ page }) => {
    await page.goto('/reset-password?token=token-expirado');

    await page.route('**/api/auth/reset-password', (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Token inválido ou expirado.' }),
      }),
    );

    await page.getByLabel('Nova senha').fill('novaSenha123');
    await page.getByLabel('Confirmar senha').fill('novaSenha123');
    await page.getByRole('button', { name: 'Redefinir senha' }).click();

    await expect(page.getByText('Erro ao redefinir senha')).toBeVisible({ timeout: 8000 });
  });

  test('exibe erro de validação quando as senhas não coincidem', async ({ page }) => {
    await page.goto('/reset-password?token=valid-token-abc');

    await page.getByLabel('Nova senha').fill('senha123');
    await page.getByLabel('Confirmar senha').fill('outraSenha');
    await page.getByRole('button', { name: 'Redefinir senha' }).click();

    await expect(page.getByText(/senhas|coincidem/i)).toBeVisible({ timeout: 5000 });
  });

  test('"Solicitar novo link" navega para /forgot-password', async ({ page }) => {
    await page.goto('/reset-password');

    await page.getByRole('link', { name: 'Solicitar novo link' }).click();
    await expect(page).toHaveURL(/\/forgot-password/, { timeout: 8000 });
  });
});
