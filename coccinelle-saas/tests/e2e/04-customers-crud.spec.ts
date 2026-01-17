import { test, expect } from '@playwright/test';

test.describe('Customers CRUD - Strict Tests', () => {
  test.beforeEach(async ({ page }) => {
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
    // STRICT: Must be on customers page
    expect(page.url()).toContain('/dashboard/customers');

    // STRICT: Page must have customers heading
    const heading = page.locator('h1, h2').filter({ hasText: /clients?|customers?/i }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('BUG CHECK: Must display "Nouveau client" button', async ({ page }) => {
    // STRICT: Must have a button to create new customer
    const createButton = page.locator('button').filter({
      hasText: /nouveau client|ajouter|créer|add customer|create|new customer/i
    }).first();

    await expect(createButton).toBeVisible({ timeout: 5000 });
  });

  test('BUG CHECK: Must display stats cards', async ({ page }) => {
    // STRICT: Must have stats cards
    const totalCard = page.locator('text=/total clients?/i');
    await expect(totalCard).toBeVisible({ timeout: 5000 });

    const vipCard = page.locator('text=/clients? vip/i');
    await expect(vipCard).toBeVisible({ timeout: 5000 });
  });

  test('BUG CHECK: Create customer modal must open and have required fields', async ({ page }) => {
    // Click create button
    const createButton = page.locator('button').filter({
      hasText: /nouveau client/i
    }).first();
    await createButton.click();
    await page.waitForTimeout(500);

    // STRICT: Modal must be visible
    const modal = page.locator('[class*="fixed"]').filter({ hasText: /nouveau client/i }).first();
    await expect(modal).toBeVisible({ timeout: 3000 });

    // STRICT: Form must have first name field
    const firstNameField = page.locator('input').first();
    await expect(firstNameField).toBeVisible();

    // STRICT: Form must have email field
    const emailField = page.locator('input[type="email"]');
    await expect(emailField).toBeVisible();

    // STRICT: Form must have status dropdown
    const statusSelect = page.locator('select').first();
    await expect(statusSelect).toBeVisible();

    // STRICT: Form must have submit button
    const submitButton = page.locator('button').filter({ hasText: /créer/i }).last();
    await expect(submitButton).toBeVisible();
  });

  test('BUG CHECK: Creating a customer must add it to the list', async ({ page }) => {
    // Click create button
    const createButton = page.locator('button').filter({
      hasText: /nouveau client/i
    }).first();
    await createButton.click();
    await page.waitForTimeout(500);

    // Fill customer details
    const customerFirstName = `TestClient`;
    const customerLastName = `E2E${Date.now()}`;
    const customerEmail = `client-${Date.now()}@test.com`;

    // Fill first name (first input in modal)
    const firstNameInput = page.locator('input[type="text"]').first();
    await firstNameInput.fill(customerFirstName);

    // Fill last name (second input)
    const lastNameInput = page.locator('input[type="text"]').nth(1);
    await lastNameInput.fill(customerLastName);

    // Fill email
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(customerEmail);

    // Fill phone
    const phoneInput = page.locator('input[type="tel"]');
    await phoneInput.fill('+33612345678');

    // Submit form
    const submitButton = page.locator('button').filter({ hasText: /créer/i }).last();
    await submitButton.click();

    // Wait for modal to close and list to refresh
    await page.waitForTimeout(2000);

    // Handle alert if present
    page.on('dialog', dialog => dialog.accept());

    // STRICT: Customer must appear in the list
    const customerInList = page.locator(`text="${customerFirstName}"`).or(page.locator(`text="${customerLastName}"`));
    await expect(customerInList.first()).toBeVisible({ timeout: 5000 });
  });

  test('BUG CHECK: Search must filter customers', async ({ page }) => {
    // First create a customer with unique name
    const uniqueName = `SearchTest${Date.now()}`;
    
    const createButton = page.locator('button').filter({ hasText: /nouveau client/i }).first();
    await createButton.click();
    await page.waitForTimeout(500);

    const firstNameInput = page.locator('input[type="text"]').first();
    await firstNameInput.fill(uniqueName);

    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(`search-${Date.now()}@test.com`);

    const submitButton = page.locator('button').filter({ hasText: /créer/i }).last();
    await submitButton.click();
    await page.waitForTimeout(2000);

    // Handle alert
    page.on('dialog', dialog => dialog.accept());

    // Now search for the customer
    const searchInput = page.locator('input[placeholder*="echercher"]');
    await searchInput.fill(uniqueName);
    await page.waitForTimeout(500);

    // STRICT: Customer with that name must be visible
    const customerInList = page.locator(`text="${uniqueName}"`);
    await expect(customerInList.first()).toBeVisible({ timeout: 5000 });
  });

  test('BUG CHECK: Edit customer must update the customer', async ({ page }) => {
    // First create a customer
    const originalName = `EditTest${Date.now()}`;
    
    const createButton = page.locator('button').filter({ hasText: /nouveau client/i }).first();
    await createButton.click();
    await page.waitForTimeout(500);

    const firstNameInput = page.locator('input[type="text"]').first();
    await firstNameInput.fill(originalName);

    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(`edit-${Date.now()}@test.com`);

    let submitButton = page.locator('button').filter({ hasText: /créer/i }).last();
    await submitButton.click();
    await page.waitForTimeout(2000);

    // Handle alert
    page.on('dialog', dialog => dialog.accept());

    // Find and click edit button for the customer
    const editButton = page.locator('button[title="Modifier"]').first();
    await editButton.click();
    await page.waitForTimeout(500);

    // Update the name
    const updatedName = `${originalName}UPDATED`;
    const editFirstNameInput = page.locator('input[type="text"]').first();
    await editFirstNameInput.clear();
    await editFirstNameInput.fill(updatedName);

    // Submit update
    submitButton = page.locator('button').filter({ hasText: /enregistrer/i }).last();
    await submitButton.click();
    await page.waitForTimeout(2000);

    // STRICT: Updated customer must appear in list
    const updatedCustomer = page.locator(`text="${updatedName}"`);
    await expect(updatedCustomer.first()).toBeVisible({ timeout: 5000 });
  });

  test('BUG CHECK: Delete customer must remove it from list', async ({ page }) => {
    // First create a customer to delete
    const customerToDelete = `DeleteTest${Date.now()}`;
    
    const createButton = page.locator('button').filter({ hasText: /nouveau client/i }).first();
    await createButton.click();
    await page.waitForTimeout(500);

    const firstNameInput = page.locator('input[type="text"]').first();
    await firstNameInput.fill(customerToDelete);

    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(`delete-${Date.now()}@test.com`);

    const submitButton = page.locator('button').filter({ hasText: /créer/i }).last();
    await submitButton.click();
    await page.waitForTimeout(2000);

    // Handle alerts
    page.on('dialog', dialog => dialog.accept());

    // Verify customer is in list
    await expect(page.locator(`text="${customerToDelete}"`).first()).toBeVisible();

    // Find and click delete button
    const deleteButton = page.locator('button[title="Supprimer"]').first();
    await deleteButton.click();
    await page.waitForTimeout(500);

    // Confirm deletion in modal
    const confirmButton = page.locator('button').filter({ hasText: /supprimer/i }).last();
    await confirmButton.click();
    await page.waitForTimeout(2000);

    // STRICT: Customer must NOT be visible in list
    await expect(page.locator(`text="${customerToDelete}"`).first()).not.toBeVisible({ timeout: 5000 });
  });

  test('BUG CHECK: Export CSV button must exist', async ({ page }) => {
    // STRICT: Must have export button
    const exportButton = page.locator('button').filter({ hasText: /exporter|export|csv/i }).first();
    await expect(exportButton).toBeVisible({ timeout: 5000 });
  });

  test('BUG CHECK: Status filter must work', async ({ page }) => {
    // STRICT: Must have status filter dropdown
    const statusFilter = page.locator('select').filter({ has: page.locator('option:has-text("Tous les statuts")') });
    await expect(statusFilter).toBeVisible({ timeout: 5000 });

    // Change filter to VIP
    await statusFilter.selectOption('vip');
    await page.waitForTimeout(500);

    // Page should refresh (no error)
    expect(page.url()).toContain('/dashboard/customers');
  });
});
