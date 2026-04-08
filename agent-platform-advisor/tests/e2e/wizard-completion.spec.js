// @ts-check
const { test, expect } = require('@playwright/test');

// Answers that produce a clear Copilot Studio winner:
// q1c (pro dev), q8a (internal), q2d (multiple places), q4b (conversation), q3b (other systems)
const WIZARD_ANSWERS = {
  q1: 'q1c', // Professional developer
  q8: 'q8a', // Internal employees
  q2: 'q2d', // Multiple places
  q4: 'q4b', // Back-and-forth conversation
  q3: 'q3b', // Other business systems
};

// The YAML question order is: q1, q8, q2, q4, q3
const QUESTION_ORDER = ['q1', 'q8', 'q2', 'q4', 'q3'];

// Map question IDs to option indices (0-based) for clicking
const OPTION_INDEX = {
  q1: 2, // q1c is 3rd option
  q8: 0, // q8a is 1st option
  q2: 3, // q2d is 4th option
  q4: 1, // q4b is 2nd option
  q3: 1, // q3b is 2nd option
};

test.describe('Wizard Completion', () => {
  test('completes full wizard and shows recommendation', async ({ page }) => {
    await page.goto('/');

    // Wait for YAML to load and welcome section to appear
    await expect(page.locator('#welcome-section')).toBeVisible();

    // Click "Get started"
    await page.locator('#start-btn').click();
    await expect(page.locator('#prescreen-section')).toBeVisible();

    // Click "No" — start full assessment
    await page.locator('#prescreen-no').click();
    await expect(page.locator('#assessment-section')).toBeVisible();

    // Answer all 5 questions
    for (let i = 0; i < QUESTION_ORDER.length; i++) {
      const qId = QUESTION_ORDER[i];
      const optIdx = OPTION_INDEX[qId];

      // Verify question counter
      await expect(page.locator('#question-counter')).toContainText(
        `Question ${i + 1} of ${QUESTION_ORDER.length}`
      );

      // Click the option (scoped to assessment options, not prescreen cards)
      const options = page.locator('#options-list .option-card');
      await options.nth(optIdx).click();

      // Verify option is selected
      await expect(options.nth(optIdx)).toHaveClass(/selected/);

      // Click Next (or "Get Recommendation" on last question)
      await page.locator('#next-btn').click();
    }

    // Verify recommendation section is visible
    await expect(page.locator('#recommendation-section')).toBeVisible();

    // Verify a platform card is rendered
    await expect(page.locator('#rec-primary-card .rec-card')).toBeVisible();

    // Verify score breakdown exists
    await expect(page.locator('#rec-score-comparison')).toBeVisible();

    // Verify the tab title updated
    await expect(page).toHaveTitle(/APA:.*recommended/);
  });

  test('back button navigates to previous question', async ({ page }) => {
    await page.goto('/');
    await page.locator('#start-btn').click();
    await page.locator('#prescreen-no').click();

    // Answer first question
    await page.locator('#options-list .option-card').first().click();
    await page.locator('#next-btn').click();

    // We should be on question 2
    await expect(page.locator('#question-counter')).toContainText('Question 2');

    // Click back
    await page.locator('#prev-btn').click();

    // Should be back on question 1
    await expect(page.locator('#question-counter')).toContainText('Question 1');
  });

  test('back from first question returns to prescreen', async ({ page }) => {
    await page.goto('/');
    await page.locator('#start-btn').click();
    await page.locator('#prescreen-no').click();
    await expect(page.locator('#assessment-section')).toBeVisible();

    await page.locator('#prev-btn').click();
    await expect(page.locator('#prescreen-section')).toBeVisible();
  });

  test('next button is disabled until an option is selected', async ({ page }) => {
    await page.goto('/');
    await page.locator('#start-btn').click();
    await page.locator('#prescreen-no').click();

    // Next button should be disabled
    await expect(page.locator('#next-btn')).toBeDisabled();

    // Select an option
    await page.locator('#options-list .option-card').first().click();

    // Next button should now be enabled
    await expect(page.locator('#next-btn')).toBeEnabled();
  });
});
