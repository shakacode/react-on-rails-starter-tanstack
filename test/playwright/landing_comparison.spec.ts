import { expect, test } from '@playwright/test';
import { preparePlaywrightAssets } from './support/rails';

// The landing page is public and uses an in-memory demo dataset, so this spec
// needs no seeded user. It exercises the TanStack comparison island: filtering,
// sorting, and pagination must happen instantly in the browser and reflect into
// the URL (rq/rsort/rdir/rpage) without a full-page reload.

test.beforeAll(() => {
  preparePlaywrightAssets();
});

test.describe('landing comparison island', () => {
  test('filters, sorts, and paginates with URL-synced state @smoke', async ({ page }) => {
    await page.goto('/');

    // Scope assertions to the island: the Rails panel now mirrors the island's
    // page size, so "Page 1 of 3 (14)" renders in both panels. Targeting the
    // island container keeps getByText matches unambiguous under strict mode.
    const island = page.getByTestId('comparison-island');
    const islandTable = page.getByTestId('island-table');
    // Only the React island input carries this aria-label; the Rails panel input does not.
    const filter = page.getByLabel('Filter projects');

    // Default page shows the configured page size out of the full demo set.
    await expect(islandTable.locator('tbody tr')).toHaveCount(5);
    await expect(island.getByText(/Page 1 of 3/)).toBeVisible();

    // Filtering is instant and reflected in the URL without navigation.
    await filter.fill('Aurora');
    await expect(islandTable.locator('tbody tr')).toHaveCount(1);
    await expect(islandTable.getByText('Aurora Analytics')).toBeVisible();
    await expect(page).toHaveURL(/rq=Aurora/);

    // Clearing the filter restores the full page.
    await filter.fill('');
    await expect(islandTable.locator('tbody tr')).toHaveCount(5);

    // Sorting by a column writes the sort key to the URL.
    await islandTable.getByRole('button', { name: /Project/ }).click();
    await expect(page).toHaveURL(/rsort=name/);

    // Pagination advances client-side and is captured in the URL.
    await island.getByRole('button', { name: 'Next' }).click();
    await expect(island.getByText(/Page 2 of 3/)).toBeVisible();
    await expect(page).toHaveURL(/rpage=2/);

    // The page never performed a server round trip: the instant-interaction
    // counter on the island keeps climbing and the reload count stays at zero.
    await expect(island.getByText(/0 page reloads/)).toBeVisible();
  });
});
