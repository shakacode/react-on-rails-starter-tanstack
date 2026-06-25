import { expect, test } from '@playwright/test';
import { seedUser, signIn } from './support/auth';
import { preparePlaywrightAssets } from './support/rails';

// Playwright runs against RAILS_ENV=test, where `prerender: !Rails.env.test?` is OFF.
// So we can't assert rows in the raw SSR HTML here; instead we prove the seed hydrates
// the TanStack Query cache: the first /projects load shows rows with NO list refetch and
// no loading flash. (The SSR-HTML behavior is exercised by a prerender-on dev/prod boot.)
const email = 'ssr-seed-playwright@example.com';

test.beforeAll(() => {
  preparePlaywrightAssets();
  seedUser({
    email,
    name: 'SSR Seed Playwright',
    projects: { count: 3, namePrefix: 'Seed Project' },
  });
});

test('projects table uses the SSR seed: rows on first paint, no list refetch', async ({ page }) => {
  const listRequests: string[] = [];
  page.on('request', (request) => {
    // List endpoint is exactly /api/projects ; metrics is /api/projects/:id/metrics.
    if (new URL(request.url()).pathname === '/api/projects') listRequests.push(request.url());
  });

  await signIn(page, email);
  await page.goto('/projects');

  const shell = page.locator('main.tanstack-shell');
  await expect(shell.getByRole('heading', { name: 'Project list' })).toBeVisible();
  await expect(shell.getByRole('link', { name: 'Seed Project 1' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Loading projects...');

  // initialData satisfied the query, so the client issued no GET /api/projects for page 1.
  expect(listRequests).toEqual([]);
});
