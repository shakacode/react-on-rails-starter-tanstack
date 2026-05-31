import { expect, test } from '@playwright/test';
import { preparePlaywrightAssets } from './support/rails';

test.beforeAll(() => {
  preparePlaywrightAssets();
});

test('public RSC showcase route loads the TanStack composition surface', async ({ page }) => {
  await page.goto('/rsc-showcase');

  await expect(
    page.getByRole('heading', { name: 'Server-streamed RSC composed inside a TanStack route on Rails' }),
  ).toBeVisible();

  const rspackFallback = page.getByText('RSC manifests are not available for this build.');

  if (await rspackFallback.isVisible().catch(() => false)) {
    await expect(page.getByText('bin/shakapacker')).toBeVisible();
    return;
  }

  await expect(page.getByText('RSC streamed by Rails, consumed by a TanStack route')).toBeVisible();
  await expect(page.getByText('Zero client JS proof')).toBeVisible();
  await expect(page.getByText('Server panel JS shipped')).toBeVisible();
  await expect(page.getByText('Payload helper')).toBeVisible();

  await page.getByRole('button', { name: 'Hydrated island' }).click();
  await expect(page.getByText('2 client clicks inside the fetched RSC payload')).toBeVisible();

  await page.getByRole('button', { name: 'Pulse client state' }).click();
  await expect(page.getByText('1 route pulse')).toBeVisible();
});
