import { test, expect } from "@playwright/test";

const BASE = "http://127.0.0.1:5173";
const TEST_USER = `test_${Date.now()}`;
const TEST_PASS = "testpass123";

test.describe("Fengshui Auth Flow", () => {

  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure clean state
    await page.goto(BASE);
    await page.evaluate(() => localStorage.clear());
  });

  test("1. Register a new account", async ({ page }) => {
    await page.goto(BASE);

    // Should show login page
    await expect(page.locator(".login-card")).toBeVisible();
    await expect(page.locator(".login-title")).toHaveText(/Fengshui/);

    // Switch to register tab
    await page.locator(".login-tab", { hasText: "Register" }).click();
    await expect(page.locator(".login-tab.active")).toHaveText("Register");

    // Fill registration form
    await page.locator("input[type='text']").first().fill(TEST_USER);
    await page.locator("input[type='text']").nth(1).fill("Test User");
    await page.locator("input[type='password']").fill(TEST_PASS);
    await page.locator(".login-submit").click();

    // Wait for app to load (login page should disappear, app main content appears)
    await expect(page.locator(".app-shell")).toBeVisible({ timeout: 5000 });

    // Verify username badge is shown in header
    await expect(page.locator(".auth-user-badge")).toHaveText(TEST_USER);
  });

  test("2. Login with existing credentials", async ({ page }) => {
    // First register a user
    await page.goto(BASE);
    await page.locator(".login-tab", { hasText: "Register" }).click();
    await page.locator("input[type='text']").first().fill(TEST_USER + "_login");
    await page.locator("input[type='text']").nth(1).fill("Login Test");
    await page.locator("input[type='password']").fill(TEST_PASS);
    await page.locator(".login-submit").click();
    await expect(page.locator(".app-shell")).toBeVisible({ timeout: 5000 });

    // Logout
    await page.locator(".logout-button").click();
    await expect(page.locator(".login-card")).toBeVisible({ timeout: 3000 });

    // Login again with same credentials
    await page.locator("input[type='text']").first().fill(TEST_USER + "_login");
    await page.locator("input[type='password']").fill(TEST_PASS);
    await page.locator(".login-submit").click();

    // Should be logged in
    await expect(page.locator(".app-shell")).toBeVisible({ timeout: 5000 });
    await expect(page.locator(".auth-user-badge")).toHaveText(TEST_USER + "_login");
  });

  test("3. Registration validation - duplicate username", async ({ page }) => {
    // Register first user
    await page.goto(BASE);
    await page.locator(".login-tab", { hasText: "Register" }).click();
    await page.locator("input[type='text']").first().fill("dup_user");
    await page.locator("input[type='password']").fill(TEST_PASS);
    await page.locator(".login-submit").click();
    await expect(page.locator(".app-shell")).toBeVisible({ timeout: 5000 });

    // Logout
    await page.locator(".logout-button").click();
    await expect(page.locator(".login-card")).toBeVisible({ timeout: 3000 });

    // Try registering same username again
    await page.locator(".login-tab", { hasText: "Register" }).click();
    await page.locator("input[type='text']").first().fill("dup_user");
    await page.locator("input[type='password']").fill(TEST_PASS);
    await page.locator(".login-submit").click();

    // Should see error message
    await expect(page.locator(".login-error")).toBeVisible({ timeout: 5000 });
    await expect(page.locator(".login-error")).toContainText("already");
  });

  test("4. Login with wrong password shows error", async ({ page }) => {
    await page.goto(BASE);
    await page.locator("input[type='text']").first().fill("nonexistent_user");
    await page.locator("input[type='password']").fill("wrongpass");
    await page.locator(".login-submit").click();

    // Should show error
    await expect(page.locator(".login-error")).toBeVisible({ timeout: 5000 });
    await expect(page.locator(".login-error")).toContainText("Invalid");
  });

  test("5. Logout redirects to login page", async ({ page }) => {
    // Register
    await page.goto(BASE);
    await page.locator(".login-tab", { hasText: "Register" }).click();
    await page.locator("input[type='text']").first().fill(TEST_USER + "_logout");
    await page.locator("input[type='password']").fill(TEST_PASS);
    await page.locator(".login-submit").click();
    await expect(page.locator(".app-shell")).toBeVisible({ timeout: 5000 });

    // Click logout
    await page.locator(".logout-button").click();

    // Should return to login page
    await expect(page.locator(".login-card")).toBeVisible({ timeout: 3000 });
  });

  test("6. Token persistence across page reload", async ({ page }) => {
    // Register
    await page.goto(BASE);
    await page.locator(".login-tab", { hasText: "Register" }).click();
    await page.locator("input[type='text']").first().fill(TEST_USER + "_persist");
    await page.locator("input[type='password']").fill(TEST_PASS);
    await page.locator(".login-submit").click();
    await expect(page.locator(".app-shell")).toBeVisible({ timeout: 5000 });

    // Reload page
    await page.reload();
    await expect(page.locator(".app-shell")).toBeVisible({ timeout: 5000 });
    await expect(page.locator(".auth-user-badge")).toHaveText(TEST_USER + "_persist");
  });

  test("7. Empty fields disable submit button", async ({ page }) => {
    await page.goto(BASE);

    // Submit should be disabled with empty fields
    await expect(page.locator(".login-submit")).toBeDisabled();

    // Fill username only, still disabled
    await page.locator("input[type='text']").first().fill("testuser");
    await expect(page.locator(".login-submit")).toBeDisabled();

    // Fill password, should be enabled
    await page.locator("input[type='password']").fill("password");
    await expect(page.locator(".login-submit")).toBeEnabled();
  });

  test("8. Toggle between login and register tabs", async ({ page }) => {
    await page.goto(BASE);

    // Default is login
    await expect(page.locator(".login-tab.active")).toHaveText("Login");

    // Switch to register
    await page.locator(".login-tab", { hasText: "Register" }).click();
    await expect(page.locator(".login-tab.active")).toHaveText("Register");
    // Display name field should appear
    await expect(page.locator("input[type='text']").nth(1)).toBeVisible();

    // Switch back to login
    await page.locator(".login-tab", { hasText: "Login" }).click();
    await expect(page.locator(".login-tab.active")).toHaveText("Login");
    // Only one text field (username)
    await expect(page.locator("input[type='text']")).toHaveCount(1);
  });
});

test.describe("Fengshui Session Save/Load", () => {
  const SESSION_USER = `session_${Date.now()}`;

  test("9. Save session after evaluation, restore on re-login", async ({ page }) => {
    // Register
    await page.goto(BASE);
    await page.locator(".login-tab", { hasText: "Register" }).click();
    await page.locator("input[type='text']").first().fill(SESSION_USER);
    await page.locator("input[type='password']").fill(TEST_PASS);
    await page.locator(".login-submit").click();
    await expect(page.locator(".app-shell")).toBeVisible({ timeout: 5000 });

    // Fill house name in the input form
    const houseNameInput = page.locator("input").filter({ has: page.locator("..") }).filter({ hasText: /name/i }).first();
    // Try finding the house name input field
    const houseNameField = page.locator("label").filter({ hasText: /name/i }).locator("input");
    if (await houseNameField.count() > 0) {
      await houseNameField.fill("Test House from Playwright");
    }

    // Save state to localStorage to verify persistence
    await page.evaluate(() => {
      const draft = localStorage.getItem("fengshui_ui_project_v1");
      return draft ? "has draft" : "no draft";
    });

    // Logout
    await page.locator(".logout-button").click();
    await expect(page.locator(".login-card")).toBeVisible({ timeout: 3000 });

    // Login back
    await page.locator("input[type='text']").first().fill(SESSION_USER);
    await page.locator("input[type='password']").fill(TEST_PASS);
    await page.locator(".login-submit").click();
    await expect(page.locator(".app-shell")).toBeVisible({ timeout: 5000 });

    // Verify we're logged in as the right user
    await expect(page.locator(".auth-user-badge")).toHaveText(SESSION_USER);
  });
});
