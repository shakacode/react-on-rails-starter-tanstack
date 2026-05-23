import { expect, test } from '@playwright/test';

test('Rails health endpoint responds', async ({ page }) => {
  const response = await page.goto('/up');

  expect(response?.ok()).toBeTruthy();
});
