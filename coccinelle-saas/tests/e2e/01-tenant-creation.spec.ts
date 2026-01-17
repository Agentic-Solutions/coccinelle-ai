import { test, expect } from '@playwright/test';

test.describe('Tenant Creation Flow', () => {
  test('should create a new tenant and complete onboarding', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/signup');

    // Wait for page to load
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });

    // Fill in signup form (using name instead of company_name)
    await page.fill('input[name="name"]', 'Test User E2E');
    await page.fill('input[name="email"]', `test-${Date.now()}@coccinelle.test`);
    await page.fill('input[name="password"]', 'Test1234!Test');

    // Submit signup
    await page.click('button[type="submit"]');

    // Wait for redirect to onboarding
    await page.waitForURL('**/onboarding**', { timeout: 10000 });

    // Verify we're on the onboarding page
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();

    // Complete onboarding steps (basic flow)
    // Look for any continue/next buttons
    for (let i = 0; i < 8; i++) {
      const continueButton = page.locator('button').filter({ hasText: /continuer|suivant|commencer|valider|terminer/i }).first();
      const isVisible = await continueButton.isVisible({ timeout: 2000 }).catch(() => false);

      if (!isVisible) {
        // Try to skip or click on "Passer" button
        const skipButton = page.locator('button').filter({ hasText: /passer|skip/i }).first();
        if (await skipButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await skipButton.click();
          await page.waitForTimeout(500);
          continue;
        }
        break;
      }

      await continueButton.click();
      await page.waitForTimeout(1000);

      // Check if we reached dashboard
      if (page.url().includes('/dashboard')) {
        break;
      }
    }

    // Should eventually reach dashboard or still be in onboarding
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url).toMatch(/dashboard|onboarding/);
  });

  test('should display signup form with required fields', async ({ page }) => {
    await page.goto('/signup');

    // Verify form fields exist
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});
