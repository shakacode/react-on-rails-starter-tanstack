import { expect, test } from '@playwright/test';
import { preparePlaywrightAssets } from './support/rails';

test.beforeAll(() => {
  preparePlaywrightAssets();
});

test('Rails health endpoint responds', async ({ page }) => {
  const response = await page.goto('/up');

  expect(response?.ok()).toBeTruthy();
});

test('public landing page loads without browser console errors', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  const response = await page.goto('/');

  expect(response?.ok()).toBeTruthy();
  await expect(page.getByRole('heading', { name: 'React Server Components on Rails' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open the RSC showcase' })).toHaveAttribute('href', '/rsc-showcase');
  expect(consoleErrors).toEqual([]);
});
