// @ts-check
const { test, expect } = require('@playwright/test');

// These answers produce a Copilot Studio recommendation.
// Setting r=agent_builder (a different platform) triggers the temporal change banner.
const CHANGED_PARAMS = 'q1=q1c&q8=q8a&q2=q2d&q4=q4b&q3=q3b&r=agent_builder&d=20260101&mode=card';

// Same answers but r= matches the actual recommendation — no temporal change
const MATCHING_PARAMS = 'q1=q1c&q8=q8a&q2=q2d&q4=q4b&q3=q3b&r=copilot_studio&d=20260101&mode=card';

test.describe('Temporal Change Detection', () => {
  test('shows change banner when recommendation differs from original', async ({ page }) => {
    await page.goto(`/?${CHANGED_PARAMS}`);

    await expect(page.locator('#recommendation-section')).toBeVisible();

    // Temporal change banner should be visible
    const banner = page.locator('#decision-card-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('recommendation has changed');
    await expect(banner).toContainText('Jan 1, 2026');
  });

  test('change banner contains retake link', async ({ page }) => {
    await page.goto(`/?${CHANGED_PARAMS}`);

    const banner = page.locator('#decision-card-banner');
    await expect(banner).toBeVisible();

    // Should contain a "Retake assessment" link
    const retakeLink = banner.locator('a');
    await expect(retakeLink).toBeVisible();
    await expect(retakeLink).toContainText('Retake assessment');
  });

  test('no change banner when recommendation matches original', async ({ page }) => {
    await page.goto(`/?${MATCHING_PARAMS}`);

    await expect(page.locator('#recommendation-section')).toBeVisible();

    // Banner should be hidden when recommendation hasn't changed
    await expect(page.locator('#decision-card-banner')).toBeHidden();
  });
});
