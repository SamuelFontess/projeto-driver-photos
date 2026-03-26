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

    // { exact: true } evita strict mode violation com o aria-live que concatena o conteúdo do toast
    await expect(page.getByText('Solicitação enviada', { exact: true })).toBeVisible({ timeout: 8000 });
  });

  test('exibe erro se o email for inválido (validação client-side)', async ({ page }) => {
    const forgotPage = new ForgotPasswordPage(page);
    await forgotPage.goto();

    // Submete com o campo vazio: o browser não bloqueia (type=email só valida formato
    // se o campo tiver valor), então o react-hook-form/Zod executa e exibe "Email inválido".
    await forgotPage.submitButton.click();

    await expect(page.getByText('Email inválido', { exact: true })).toBeVisible({ timeout: 5000 });
  });

  test('botão fica desabilitado e exibe "Enviando..." durante submissão', async ({ page }) => {
    const forgotPage = new ForgotPasswordPage(page);
    await forgotPage.goto();

    await page.route('**/api/auth/forgot-password', async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.fulfill({ status: 200, body: JSON.stringify({ message: 'ok' }) });
    });

    await forgotPage.emailInput.fill('test@driver.com');

    // react-hook-form seta isSubmitting=true sincronamente ao chamar handleSubmit,
    // antes de qualquer await. Verificamos imediatamente após o click, enquanto o
    // route handler segura a resposta por 500ms.
    await forgotPage.submitButton.click();

    // forgotPage.submitButton usa getByRole('button', { name: 'Enviar instruções' }),
    // que para de corresponder quando isSubmitting=true muda o texto para "Enviando...".
    // Usar o seletor por tipo garante que o mesmo elemento é encontrado em ambos os estados.
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeDisabled({ timeout: 3000 });
    await expect(page.getByText('Enviando...')).toBeVisible({ timeout: 3000 });
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

    // { exact: true } evita strict mode violation com o aria-live que concatena o conteúdo do toast
    await expect(page.getByText('Erro ao solicitar redefinição', { exact: true })).toBeVisible({ timeout: 8000 });
  });

  test('"Voltar para login" navega para /login', async ({ page }) => {
    const forgotPage = new ForgotPasswordPage(page);
    await forgotPage.goto();

    await forgotPage.loginLink.click();
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
  });
});
