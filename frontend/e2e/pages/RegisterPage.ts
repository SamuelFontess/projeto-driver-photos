import { Page, Locator, expect } from '@playwright/test';

export class RegisterPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly loginLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.getByLabel('Nome');
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Senha');
    this.submitButton = page.getByRole('button', { name: 'Criar conta' });
    this.loginLink = page.getByRole('link', { name: 'Entrar' });
  }

  async goto() {
    await this.page.goto('/register');
  }

  async fillAndSubmit(name: string, email: string, password: string) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectToBeOnRegisterPage() {
    await expect(this.page).toHaveURL(/\/register/);
    await expect(this.page.getByRole('heading', { name: 'Criar conta' })).toBeVisible();
  }
}
