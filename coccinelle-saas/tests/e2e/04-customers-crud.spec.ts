import { test, expect } from '@playwright/test';

test.describe('Customers CRUD - Strict Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Handle dialogs BEFORE any action
    page.on('dialog', dialog => dialog.accept());
    
    // Create a test account and login
    await page.goto('/signup');
    await page.waitForSelector('input[name="email"]');

    const timestamp = Date.now();
    await page.fill('input[name="name"]', 'Customers Test User');
    await page.fill('input[name="email"]', `customers-${timestamp}@test.com`);
    await page.fill('input[name="password"]', 'CustomersPass123!');
    await page.click('button[type="submit"]');

    // Wait for redirect to onboarding or dashboard
    await page.waitForURL(/\/onboarding|\/dashboard/, { timeout: 10000 });

    // If on onboarding, try to skip to dashboard
    if (page.url().includes('/onboarding')) {
      for (let i = 0; i < 10; i++) {
        const skipButton = page.locator('button').filter({ hasText: /passer|skip|terminer|finish|dashboard/i }).first();
        const isVisible = await skipButton.isVisible({ timeout: 1000 }).catch(() => false);
        if (isVisible) {
          await skipButton.click();
          await page.waitForTimeout(500);
        }
        if (page.url().includes('/dashboard')) break;
      }
    }

    // Navigate to customers page
    await page.goto('/dashboard/customers');
    await page.waitForTimeout(1000);
  });

  test('BUG CHECK: Customers page must be accessible', async ({ page }) => {
    expect(page.url()).toContain('/dashboard/customers');
    const heading = page.locator('h1, h2').filter({ hasText: /clients?|customers?/i }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('BUG CHECK: Must display "Nouveau client" button', async ({ page }) => {
    const createButton = page.locator('button').filter({
      hasText: /nouveau client|ajouter|créer|add customer|create|new customer/i
    }).first();
    await expect(createButton).toBeVisible({ timeout: 5000 });
  });

  test('BUG CHECK: Must display stats cards', async ({ page }) => {
    const totalCard = page.locator('text=/total clients?/i');
    await expect(totalCard).toBeVisible({ timeout: 5000 });
    const vipCard = page.locator('text=/clients? vip/i');
    await expect(vipCard).toBeVisible({ timeout: 5000 });
  });

  test('BUG CHECK: Create customer modal must open and have required fields', async ({ page }) => {
    const createButton = page.locator('button').filter({ hasText: /nouveau client/i }).first();
    await createButton.click();
    await page.waitForTimeout(500);

    // Target modal specifically
    const modal = page.locator('[class*="fixed"]').filter({ hasText: /nouveau client/i }).first();
    await expect(modal).toBeVisible({ timeout: 3000 });

    // Check fields WITHIN the modal
    const firstNameField = modal.locator('input[type="text"]').first();
    await expect(firstNameField).toBeVisible();

    const emailField = modal.locator('input[type="email"]');
    await expect(emailField).toBeVisible();

    const statusSelect = modal.locator('select').first();
    await expect(statusSelect).toBeVisible();

    const submitButton = modal.locator('button').filter({ hasText: /créer/i });
    await expect(submitButton).toBeVisible();
  });

  test('BUG CHECK: Creating a customer must add it to the list', async ({ page }) => {
    const createButton = page.locator('button').filter({ hasText: /nouveau client/i }).first();
    await createButton.click();
    await page.waitForTimeout(500);

    const customerFirstName = `Client${Date.now()}`;
    const customerEmail = `client-${Date.now()}@test.com`;

    // IMPORTANT: Target the modal specifically, not the whole page!
    const modal = page.locator('[class*="fixed"]').filter({ hasText: /nouveau client/i }).first();
    await expect(modal).toBeVisible({ timeout: 3000 });

    // Fill form WITHIN the modal
    const firstNameInput = modal.locator('input[type="text"]').first();
    await firstNameInput.fill(customerFirstName);

    const emailInput = modal.locator('input[type="email"]');
    await emailInput.fill(customerEmail);

    // Submit
    const submitButton = modal.locator('button').filter({ hasText: /créer/i });
    await submitButton.click();

    // Wait for modal to close
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // Wait for list to refresh and find customer in table
    await page.waitForTimeout(1000);
    await expect(page.locator('table').locator(`text=${customerFirstName}`)).toBeVisible({ timeout: 10000 });
  });

  test('BUG CHECK: Search must filter customers', async ({ page }) => {
    const uniqueName = `Search${Date.now()}`;
    
    // Create customer
    const createButton = page.locator('button').filter({ hasText: /nouveau client/i }).first();
    await createButton.click();
    await page.waitForTimeout(500);

    // Target modal
    const modal = page.locator('[class*="fixed"]').filter({ hasText: /nouveau client/i }).first();
    await expect(modal).toBeVisible({ timeout: 3000 });

    const firstNameInput = modal.locator('input[type="text"]').first();
    await firstNameInput.fill(uniqueName);

    const emailInput = modal.locator('input[type="email"]');
    await emailInput.fill(`search-${Date.now()}@test.com`);

    const submitButton = modal.locator('button').filter({ hasText: /créer/i });
    await submitButton.click();

    // Wait for modal to close
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // Wait for customer to appear first
    await page.waitForTimeout(1000);
    await expect(page.locator('table').locator(`text=${uniqueName}`)).toBeVisible({ timeout: 10000 });

    // Now search using the search bar (outside modal)
    const searchInput = page.locator('input[placeholder*="echercher"]');
    await searchInput.fill(uniqueName);
    await page.waitForTimeout(1000);

    // Verify customer still visible after search
    await expect(page.locator('table').locator(`text=${uniqueName}`)).toBeVisible({ timeout: 5000 });
  });

  test('BUG CHECK: Edit customer must update the customer', async ({ page }) => {
    const originalName = `Edit${Date.now()}`;
    
    // Create customer first
    const createButton = page.locator('button').filter({ hasText: /nouveau client/i }).first();
    await createButton.click();
    await page.waitForTimeout(500);

    // Target create modal
    const createModal = page.locator('[class*="fixed"]').filter({ hasText: /nouveau client/i }).first();
    await expect(createModal).toBeVisible({ timeout: 3000 });

    const firstNameInput = createModal.locator('input[type="text"]').first();
    await firstNameInput.fill(originalName);

    const emailInput = createModal.locator('input[type="email"]');
    await emailInput.fill(`edit-${Date.now()}@test.com`);

    let submitButton = createModal.locator('button').filter({ hasText: /créer/i });
    await submitButton.click();

    // Wait for modal to close
    await expect(createModal).not.toBeVisible({ timeout: 5000 });

    // Wait for customer to appear
    await page.waitForTimeout(1000);
    await expect(page.locator('table').locator(`text=${originalName}`)).toBeVisible({ timeout: 10000 });

    // Click edit button
    const editButton = page.locator('button[title="Modifier"]').first();
    await editButton.click();
    await page.waitForTimeout(500);

    // Target edit modal
    const editModal = page.locator('[class*="fixed"]').filter({ hasText: /modifier/i }).first();
    await expect(editModal).toBeVisible({ timeout: 3000 });

    // Update name WITHIN the edit modal
    const updatedName = `${originalName}UPD`;
    const editFirstNameInput = editModal.locator('input[type="text"]').first();
    await editFirstNameInput.clear();
    await editFirstNameInput.fill(updatedName);

    // Submit update
    submitButton = editModal.locator('button').filter({ hasText: /enregistrer/i });
    await submitButton.click();

    // Wait for modal to close
    await expect(editModal).not.toBeVisible({ timeout: 5000 });

    // Verify update
    await page.waitForTimeout(1000);
    await expect(page.locator('table').locator(`text=${updatedName}`)).toBeVisible({ timeout: 10000 });
  });

  test('BUG CHECK: Delete customer must remove it from list', async ({ page }) => {
    const customerToDelete = `Delete${Date.now()}`;
    
    // Create customer
    const createButton = page.locator('button').filter({ hasText: /nouveau client/i }).first();
    await createButton.click();
    await page.waitForTimeout(500);

    // Target create modal
    const createModal = page.locator('[class*="fixed"]').filter({ hasText: /nouveau client/i }).first();
    await expect(createModal).toBeVisible({ timeout: 3000 });

    const firstNameInput = createModal.locator('input[type="text"]').first();
    await firstNameInput.fill(customerToDelete);

    const emailInput = createModal.locator('input[type="email"]');
    await emailInput.fill(`delete-${Date.now()}@test.com`);

    const submitButton = createModal.locator('button').filter({ hasText: /créer/i });
    await submitButton.click();

    // Wait for modal to close
    await expect(createModal).not.toBeVisible({ timeout: 5000 });

    // Wait for customer to appear
    await page.waitForTimeout(1000);
    await expect(page.locator('table').locator(`text=${customerToDelete}`)).toBeVisible({ timeout: 10000 });

    // Click delete button
    const deleteButton = page.locator('button[title="Supprimer"]').first();
    await deleteButton.click();
    await page.waitForTimeout(500);

    // Target delete modal
    const deleteModal = page.locator('[class*="fixed"]').filter({ hasText: /supprimer/i }).first();
    await expect(deleteModal).toBeVisible({ timeout: 3000 });

    // Confirm deletion
    const confirmButton = deleteModal.locator('button').filter({ hasText: /supprimer/i });
    await confirmButton.click();

    // Wait for modal to close
    await expect(deleteModal).not.toBeVisible({ timeout: 5000 });

    // Verify customer is removed
    await page.waitForTimeout(1000);
    await expect(page.locator('table').locator(`text=${customerToDelete}`)).not.toBeVisible({ timeout: 10000 });
  });

  test('BUG CHECK: Export CSV button must exist', async ({ page }) => {
    const exportButton = page.locator('button').filter({ hasText: /exporter|export|csv/i }).first();
    await expect(exportButton).toBeVisible({ timeout: 5000 });
  });

  test('BUG CHECK: Status filter must work', async ({ page }) => {
    const statusFilter = page.locator('select').filter({ has: page.locator('option:has-text("Tous les statuts")') });
    await expect(statusFilter).toBeVisible({ timeout: 5000 });
    await statusFilter.selectOption('vip');
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/dashboard/customers');
  });
});
