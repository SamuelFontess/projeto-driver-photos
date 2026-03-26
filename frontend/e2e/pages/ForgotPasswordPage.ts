import { Page, Locator, expect } from '@playwright/test';

export class ForgotPasswordPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly loginLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.submitButton = page.getByRole('button', { name: 'Enviar instruções' });
    this.loginLink = page.getByRole('link', { name: 'Voltar para login' });
  }

  async goto() {
    await this.page.goto('/forgot-password');
  }

  async submit(email: string) {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }

  async expectToBeOnForgotPasswordPage() {
    await expect(this.page).toHaveURL(/\/forgot-password/);
    await expect(this.page.getByRole('heading', { name: 'Esqueci minha senha' })).toBeVisible();
  }
}
