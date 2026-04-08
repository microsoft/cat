// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Fast-Track Path', () => {
  test('prescreen Yes leads to M365 Copilot recommendation', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#welcome-section')).toBeVisible();

    // Click "Get started"
    await page.locator('#start-btn').click();
    await expect(page.locator('#prescreen-section')).toBeVisible();

    // Click "Yes" — fast-track path
    await page.locator('#prescreen-yes').click();

    // Should jump straight to recommendation
    await expect(page.locator('#recommendation-section')).toBeVisible();
    await expect(page.locator('#assessment-section')).toBeHidden();

    // Primary card should mention Microsoft 365 Copilot
    await expect(page.locator('#rec-primary-card')).toContainText('Microsoft 365 Copilot');
  });

  test('fast-track hides score breakdown', async ({ page }) => {
    await page.goto('/');
    await page.locator('#start-btn').click();
    await page.locator('#prescreen-yes').click();

    // Score toggle and comparison should be hidden
    await expect(page.locator('#rec-score-toggle')).toBeHidden();
    await expect(page.locator('#rec-score-comparison')).toBeHidden();
  });

  test('fast-track shows prompt to start full assessment', async ({ page }) => {
    await page.goto('/');
    await page.locator('#start-btn').click();
    await page.locator('#prescreen-yes').click();

    // Fast-track prompt should be visible
    await expect(page.locator('#rec-fasttrack-prompt')).toBeVisible();
  });

  test('fast-track shows recommendation card', async ({ page }) => {
    await page.goto('/');
    await page.locator('#start-btn').click();
    await page.locator('#prescreen-yes').click();

    // Primary rec card should show Microsoft 365 Copilot
    await expect(page.locator('#rec-primary-card .rec-card')).toBeVisible();
    await expect(page.locator('#rec-primary-card')).toContainText('Microsoft 365 Copilot');
  });

  test('fast-track via URL params', async ({ page }) => {
    await page.goto('/?ft=1&r=m365_copilot&d=20260401&mode=card');

    // Should show recommendation directly
    await expect(page.locator('#recommendation-section')).toBeVisible();
    await expect(page.locator('#rec-primary-card')).toContainText('Microsoft 365 Copilot');
  });

  test('fast-track updates tab title', async ({ page }) => {
    await page.goto('/');
    await page.locator('#start-btn').click();
    await page.locator('#prescreen-yes').click();

    await expect(page).toHaveTitle(/APA:.*recommended/);
  });
});
