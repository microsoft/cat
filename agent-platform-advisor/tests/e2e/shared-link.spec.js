// @ts-check
const { test, expect } = require('@playwright/test');

// Pre-built URL params that produce a Copilot Studio recommendation:
// q1=q1c (pro dev), q8=q8a (internal), q2=q2d (multiple), q4=q4b (convo), q3=q3b (other systems)
const SHARED_PARAMS = 'q1=q1c&q8=q8a&q2=q2d&q4=q4b&q3=q3b&r=copilot_studio&d=20260401&mode=card';

test.describe('Shared Link Loading', () => {
  test('loads results directly from URL parameters', async ({ page }) => {
    await page.goto(`/?${SHARED_PARAMS}`);

    // Should skip wizard and show results directly
    await expect(page.locator('#recommendation-section')).toBeVisible();
    await expect(page.locator('#welcome-section')).toBeHidden();
    await expect(page.locator('#assessment-section')).toBeHidden();
  });

  test('displays decision card with shared context', async ({ page }) => {
    await page.goto(`/?${SHARED_PARAMS}`);

    // Decision card should be visible
    await expect(page.locator('#decision-card')).toBeVisible();

    // "Take your own assessment" link should be visible (URL-loaded mode)
    await expect(page.locator('#decision-card-context')).toBeVisible();
    await expect(page.locator('#decision-card-context')).toContainText('Take your own assessment');

    // Re-evaluate link should be visible
    await expect(page.locator('#decision-card-reevaluate')).toBeVisible();
  });

  test('shows platform chip in decision card', async ({ page }) => {
    await page.goto(`/?${SHARED_PARAMS}`);

    await expect(page.locator('#decision-card-chip')).toBeVisible();
    // Should show a platform name
    await expect(page.locator('#decision-card-chip')).not.toBeEmpty();
  });

  test('shows score in decision card', async ({ page }) => {
    await page.goto(`/?${SHARED_PARAMS}`);

    const scoreEl = page.locator('#decision-card-score');
    await expect(scoreEl).toBeVisible();
    // Score should contain a number/15 format
    await expect(scoreEl).toContainText('/15');
  });

  test('renders platform recommendation card', async ({ page }) => {
    await page.goto(`/?${SHARED_PARAMS}`);

    // Primary recommendation card should exist
    await expect(page.locator('#rec-primary-card .rec-card')).toBeVisible();
  });

  test('handles invalid URL params gracefully', async ({ page }) => {
    // Load with completely bogus params
    await page.goto('/?q1=invalid&q2=garbage');

    // Should fall back to welcome screen
    await expect(page.locator('#welcome-section')).toBeVisible();
  });

  test('handles partial URL params with schema drift', async ({ page }) => {
    // Only 3 of 5 answers — should still load results but flag drift
    const partialParams = 'q1=q1c&q8=q8a&q2=q2d&r=copilot_studio&d=20260401&mode=card';
    await page.goto(`/?${partialParams}`);

    // Should show results
    await expect(page.locator('#recommendation-section')).toBeVisible();

    // Drift note should be visible
    await expect(page.locator('#decision-card-drift')).toBeVisible();
  });
});
