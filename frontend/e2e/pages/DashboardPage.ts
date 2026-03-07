import { Page, Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;

  // Sidebar
  readonly sidebarLogo: Locator;
  readonly navDashboard: Locator;
  readonly navFamily: Locator;
  readonly navProfile: Locator;
  readonly logoutButton: Locator;

  // Header
  readonly searchInput: Locator;
  readonly modeToggle: Locator;

  // Content
  readonly welcomeMessage: Locator;
  readonly emptyFolderState: Locator;

  constructor(page: Page) {
    this.page = page;

    this.sidebarLogo = page.getByRole('link', { name: /Driver|ir para início/ });
    this.navDashboard = page.getByRole('link', { name: 'Início' });
    this.navFamily = page.getByRole('link', { name: 'Família' });
    this.navProfile = page.getByRole('link', { name: 'Perfil' });
    this.logoutButton = page.getByRole('button', { name: 'Sair' });

    this.searchInput = page.getByLabel('Buscar arquivos e pastas');
    this.modeToggle = page.getByRole('button', { name: /Alternar tema|Toggle theme/i });

    this.welcomeMessage = page.getByText(/Olá,/);
    this.emptyFolderState = page.getByText('Esta pasta está vazia');
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async gotoProfile() {
    await this.page.goto('/dashboard/profile');
  }

  async expectToBeOnDashboard() {
    await expect(this.page).toHaveURL(/\/dashboard/);
    await expect(this.navDashboard).toBeVisible();
  }

  async logout() {
    await this.logoutButton.click();
  }
}
