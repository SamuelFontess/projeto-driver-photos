import { test, expect } from '@playwright/test';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { setupUnauthenticatedState } from '../fixtures/auth';

test.describe('Recuperação de senha', () => {
  test.beforeEach(async ({ page }) => {
    await setupUnauthenticatedState(page);
  });

  test('exibe o formulário corretamente', async ({ page }) => {
    const forgotPage = new ForgotPasswordPage(page);
    await forgotPage.goto();

    await expect(page.getByRole('heading', { name: 'Esqueci minha senha' })).toBeVisible();
    await expect(forgotPage.emailInput).toBeVisible();
    await expect(forgotPage.submitButton).toBeVisible();
    await expect(forgotPage.loginLink).toBeVisible();
  });

  test('envia solicitação com sucesso e exibe toast de confirmação', async ({ page }) => {
    const forgotPage = new ForgotPasswordPage(page);
    await forgotPage.goto();

    await page.route('**/api/auth/forgot-password', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Email enviado se existir.' }),
      }),
    );

    await forgotPage.submit('test@driver.com');

    await expect(page.getByText('Solicitação enviada')).toBeVisible({ timeout: 8000 });
  });

  test('exibe erro se o email for inválido (validação client-side)', async ({ page }) => {
    const forgotPage = new ForgotPasswordPage(page);
    await forgotPage.goto();

    await forgotPage.emailInput.fill('email-invalido');
    await forgotPage.submitButton.click();

    // O formulário usa zod — deve exibir mensagem de validação sem chamar a API
    await expect(page.getByText(/email|inválido/i)).toBeVisible({ timeout: 5000 });
  });

  test('botão fica desabilitado e exibe "Enviando..." durante submissão', async ({ page }) => {
    const forgotPage = new ForgotPasswordPage(page);
    await forgotPage.goto();

    await page.route('**/api/auth/forgot-password', async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      route.fulfill({ status: 200, body: JSON.stringify({ message: 'ok' }) });
    });

    await forgotPage.emailInput.fill('test@driver.com');
    await forgotPage.submitButton.click();

    await expect(forgotPage.submitButton).toBeDisabled();
    await expect(page.getByText('Enviando...')).toBeVisible();
  });

  test('exibe toast de erro se a API retornar falha', async ({ page }) => {
    const forgotPage = new ForgotPasswordPage(page);
    await forgotPage.goto();

    await page.route('**/api/auth/forgot-password', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Erro interno' }),
      }),
    );

    await forgotPage.submit('test@driver.com');

    await expect(page.getByText('Erro ao solicitar redefinição')).toBeVisible({ timeout: 8000 });
  });

  test('"Voltar para login" navega para /login', async ({ page }) => {
    const forgotPage = new ForgotPasswordPage(page);
    await forgotPage.goto();

    await forgotPage.loginLink.click();
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
  });
});
