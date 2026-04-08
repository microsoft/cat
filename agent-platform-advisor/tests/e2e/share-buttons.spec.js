// @ts-check
const { test, expect } = require('@playwright/test');

// Answers that produce a clear Copilot Studio winner
const QUESTION_ORDER = ['q1', 'q8', 'q2', 'q4', 'q3'];
const OPTION_INDEX = {
  q1: 2, // q1c — Professional developer
  q8: 0, // q8a — Internal employees
  q2: 3, // q2d — Multiple places
  q4: 1, // q4b — Back-and-forth conversation
  q3: 1, // q3b — Other business systems
};

async function completeWizard(page) {
  await page.goto('/');
  await page.locator('#start-btn').click();
  await page.locator('#prescreen-no').click();

  for (let i = 0; i < QUESTION_ORDER.length; i++) {
    const optIdx = OPTION_INDEX[QUESTION_ORDER[i]];
    await page.locator('#options-list .option-card').nth(optIdx).click();
    await page.locator('#next-btn').click();
  }

  await expect(page.locator('#recommendation-section')).toBeVisible();
}

test.describe('Share Button', () => {
  test('share button is visible after wizard completion', async ({ page }) => {
    await completeWizard(page);
    await expect(page.locator('#decision-card-share')).toBeVisible();
  });

  test('share button copies URL to clipboard', async ({ page, context }) => {
    // Grant clipboard permission
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await completeWizard(page);
    await page.locator('#decision-card-share').click();

    // Button should show success feedback
    await expect(page.locator('#decision-card-share')).toContainText('Copied');

    // Verify clipboard contains a URL with expected params
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('q1=q1c');
    expect(clipboardText).toContain('q8=q8a');
    expect(clipboardText).toContain('mode=card');
    expect(clipboardText).toContain('r=');
    expect(clipboardText).toContain('d=');
  });

  test('share button reverts text after timeout', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await completeWizard(page);

    const btn = page.locator('#decision-card-share');
    const originalText = await btn.textContent();

    await btn.click();
    await expect(btn).toContainText('Copied');

    // Wait for revert (2s timeout in code + buffer)
    await expect(btn).toContainText(originalText?.trim() ?? 'Share your results', { timeout: 5000 });
  });

  test('share link from URL-loaded results contains all answers', async ({ page }) => {
    const params = 'q1=q1c&q8=q8a&q2=q2d&q4=q4b&q3=q3b&r=copilot_studio&d=20260401&mode=card';
    await page.goto(`/?${params}`);
    await expect(page.locator('#recommendation-section')).toBeVisible();

    // Evaluate buildShareableURL directly
    const shareUrl = await page.evaluate(() => {
      // @ts-ignore — global function
      return buildShareableURL();
    });

    expect(shareUrl).toContain('q1=q1c');
    expect(shareUrl).toContain('q8=q8a');
    expect(shareUrl).toContain('q2=q2d');
    expect(shareUrl).toContain('q4=q4b');
    expect(shareUrl).toContain('q3=q3b');
    expect(shareUrl).toContain('mode=card');
  });
});
