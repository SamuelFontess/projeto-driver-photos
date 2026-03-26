import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { setupUnauthenticatedState } from "../fixtures/auth";

const MOCK_USER = { id: "1", email: "test@driver.com", name: "Test User" };
const MOCK_TOKEN = "mock-token-abc123";

test.describe("Login", () => {
  test.beforeEach(async ({ page }) => {
    await setupUnauthenticatedState(page);
  });

  test("exibe a página de login corretamente", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(page).toHaveTitle(/Driver|Next/i);
    await expect(loginPage.logo).toBeVisible();
    await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(loginPage.forgotPasswordLink).toBeVisible();
    await expect(loginPage.registerLink).toBeVisible();
  });

  test("botão de submit fica desabilitado enquanto submete", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Mock lento para observar o estado de loading
    await page.route("**/api/auth/login", async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ token: MOCK_TOKEN, user: MOCK_USER }),
      });
    });

    await loginPage.emailInput.fill("test@driver.com");
    await loginPage.passwordInput.fill("senha123");
    await loginPage.submitButton.click();

    await expect(loginPage.submitButton).toBeDisabled();
    await expect(page.getByText("Entrando...")).toBeVisible();
  });

  test("exibe erro com credenciais inválidas", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await page.route("**/api/auth/login", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Credenciais inválidas" }),
      }),
    );

    await loginPage.fillAndSubmit("errado@email.com", "senhaerrada");

    // Toast de erro deve aparecer
    await expect(
      page.getByText("Erro ao fazer login", { exact: true }),
    ).toBeVisible();
  });

  test("redireciona para /dashboard após login bem-sucedido", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await page.route("**/api/auth/login", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        // Set-Cookie necessário: o middleware Next.js verifica o cookie server-side
        // antes de qualquer chamada de API. Sem ele o middleware redireciona para /login.
        headers: {
          "Set-Cookie": `access_token=${MOCK_TOKEN}; Path=/; HttpOnly; SameSite=Strict`,
        },
        body: JSON.stringify({
          token: MOCK_TOKEN,
          user: MOCK_USER,
          message: "ok",
        }),
      }),
    );
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: MOCK_USER }),
      }),
    );
    await page.route("**/api/folders**", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          folders: [],
          total: 0,
          page: 1,
          limit: 50,
          totalPages: 0,
        }),
      }),
    );
    await page.route("**/api/files**", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          files: [],
          total: 0,
          page: 1,
          limit: 50,
          totalPages: 0,
        }),
      }),
    );

    await loginPage.fillAndSubmit("test@driver.com", "senha123");

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 8000 });
  });

  test('link "Criar conta" navega para /register', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.submitButton).toBeVisible({ timeout: 8000 });
    await loginPage.registerLink.click();
    await expect(page).toHaveURL(/\/register/, { timeout: 8000 });
  });

  test('link "Esqueci minha senha" navega para /forgot-password', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.submitButton).toBeVisible({ timeout: 8000 });
    await loginPage.forgotPasswordLink.click();
    await expect(page).toHaveURL(/\/forgot-password/, { timeout: 8000 });
  });
});

test.describe("Registro", () => {
  test.beforeEach(async ({ page }) => {
    await setupUnauthenticatedState(page);
  });

  test("exibe a página de registro corretamente", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    await expect(
      page.getByRole("heading", { name: "Criar conta" }),
    ).toBeVisible();
    await expect(registerPage.nameInput).toBeVisible();
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.submitButton).toBeVisible();
    await expect(registerPage.loginLink).toBeVisible();
  });

  test("redireciona para /dashboard após registro bem-sucedido", async ({
    page,
  }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    await page.route("**/api/auth/register", (route) =>
      route.fulfill({
        status: 201,
        contentType: "application/json",
        headers: {
          "Set-Cookie": `access_token=${MOCK_TOKEN}; Path=/; HttpOnly; SameSite=Strict`,
        },
        body: JSON.stringify({
          token: MOCK_TOKEN,
          user: MOCK_USER,
          message: "ok",
        }),
      }),
    );
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: MOCK_USER }),
      }),
    );
    await page.route("**/api/folders**", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          folders: [],
          total: 0,
          page: 1,
          limit: 50,
          totalPages: 0,
        }),
      }),
    );
    await page.route("**/api/files**", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          files: [],
          total: 0,
          page: 1,
          limit: 50,
          totalPages: 0,
        }),
      }),
    );

    await registerPage.fillAndSubmit(
      "Test User",
      "test@driver.com",
      "senha123",
    );

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 8000 });
  });

  test("exibe erro se o email já existe", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    await page.route("**/api/auth/register", (route) =>
      route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ error: "Email já cadastrado" }),
      }),
    );

    await registerPage.fillAndSubmit(
      "Outro User",
      "existe@driver.com",
      "senha123",
    );

    await expect(
      page.getByText("Erro ao criar conta", { exact: true }),
    ).toBeVisible();
  });

  test('link "Entrar" navega para /login', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    await registerPage.loginLink.click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Recuperação de senha", () => {
  test("exibe o formulário de recuperação", async ({ page }) => {
    await setupUnauthenticatedState(page);
    await page.goto("/forgot-password");

    await expect(
      page.getByRole("heading", { name: /recuperar|senha|Forgot/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });
});
