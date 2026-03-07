import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly registerLink: Locator;
  readonly forgotPasswordLink: Locator;
  readonly logo: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Senha');
    this.submitButton = page.locator('button[type="submit"]');
    this.registerLink = page.getByRole('link', { name: 'Criar conta' });
    this.forgotPasswordLink = page.getByRole('link', { name: 'Esqueci minha senha' });
    this.logo = page.getByText('Driver');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async fillAndSubmit(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectToBeOnLoginPage() {
    await expect(this.page).toHaveURL(/\/login/);
    await expect(this.page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
  }
}
