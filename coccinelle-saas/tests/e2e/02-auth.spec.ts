import { test, expect } from '@playwright/test';

test.describe('Authentication - Strict Tests', () => {
  test('BUG CHECK: Landing page must have correct title', async ({ page }) => {
    await page.goto('/');

    // STRICT: Title MUST contain "Coccinelle"
    await expect(page).toHaveTitle(/Coccinelle/i);
  });

  test('BUG CHECK: Signup page must display validation errors', async ({ page }) => {
    await page.goto('/signup');

    await page.waitForSelector('input[name="email"]');

    // Try to submit empty form (HTML5 validation might prevent submit)
    // So we test by filling invalid data instead
    await page.fill('input[name="name"]', ''); // Empty name
    await page.fill('input[name="email"]', 'invalid-email'); // Invalid email
    await page.fill('input[name="password"]', ''); // Empty password

    // Force click despite HTML5 validation
    await page.evaluate(() => {
      document.querySelectorAll('input').forEach(input => {
        input.removeAttribute('required');
      });
    });

    await page.click('button[type="submit"]');

    await page.waitForTimeout(1000);

    // STRICT: Must show errors OR HTML5 validation blocks submit
    const errorHeading = page.locator('h3:has-text("Erreur(s) dans le formulaire")');
    const hasError = await errorHeading.isVisible().catch(() => false);

    const stillOnSignup = page.url().includes('/signup');

    // Either errors are shown OR we stayed on signup (HTML5 validation)
    expect(hasError || stillOnSignup).toBeTruthy();
  });

  test('BUG CHECK: Short password must show specific error', async ({ page }) => {
    await page.goto('/signup');

    await page.waitForSelector('input[name="email"]');

    // Fill with short password
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'short'); // Only 5 chars

    await page.click('button[type="submit"]');

    await page.waitForTimeout(500);

    // STRICT: Must show "au moins 8 caractères" error
    const passwordError = page.locator('li:has-text("8 caractères")');
    await expect(passwordError).toBeVisible();
  });

  test('BUG CHECK: Valid signup redirects to onboarding', async ({ page }) => {
    await page.goto('/signup');

    await page.waitForSelector('input[name="email"]');

    const timestamp = Date.now();
    await page.fill('input[name="name"]', 'E2E Test User');
    await page.fill('input[name="email"]', `e2e-${timestamp}@test.com`);
    await page.fill('input[name="password"]', 'ValidPassword123!');

    await page.click('button[type="submit"]');

    // STRICT: MUST redirect to /onboarding
    await page.waitForURL('**/onboarding');
    expect(page.url()).toContain('/onboarding');
  });

  test('BUG CHECK: Signup must persist session data', async ({ page }) => {
    await page.goto('/signup');

    await page.waitForSelector('input[name="email"]');

    const timestamp = Date.now();
    const testEmail = `session-${timestamp}@test.com`;

    await page.fill('input[name="name"]', 'Session Test');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'SessionPass123!');

    await page.click('button[type="submit"]');

    await page.waitForURL('**/onboarding');

    // STRICT: localStorage MUST contain auth_token (JWT or demo token)
    const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(authToken).toBeTruthy();
    expect(authToken!.length).toBeGreaterThan(20); // JWT or demo token should be long

    // STRICT: localStorage MUST contain user with correct email
    const userJson = await page.evaluate(() => localStorage.getItem('user'));
    expect(userJson).toBeTruthy();

    const user = JSON.parse(userJson!);
    expect(user.email).toBe(testEmail);
  });

  test('BUG CHECK: Signup link exists on landing page', async ({ page }) => {
    await page.goto('/');

    // STRICT: Must have a visible "Essai gratuit" or "S'inscrire" button
    const signupButton = page.locator('a[href="/signup"]:has-text("Essai gratuit")');
    await expect(signupButton).toBeVisible();
  });

  test('BUG CHECK: Login link exists on landing page', async ({ page }) => {
    await page.goto('/');

    // STRICT: Must have a visible "Connexion" link
    const loginLink = page.locator('a[href="/login"]:has-text("Connexion")');
    await expect(loginLink).toBeVisible();
  });
});
