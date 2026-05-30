import { expect, test } from '@playwright/test';
import { seedUser, signIn } from './support/auth';
import { preparePlaywrightAssets } from './support/rails';

const email = 'csp-playwright@example.com';

test.beforeAll(() => {
  preparePlaywrightAssets();
  seedUser({
    email,
    name: 'CSP Playwright',
    projects: {
      count: 2,
      description: 'CSP browser coverage',
      namePrefix: 'CSP Project',
    },
  });
});

test('baseline CSP allows public and authenticated browser flows', async ({ page }) => {
  const cspConsoleErrors: string[] = [];

  page.on('console', (message) => {
    const text = message.text();

    if (text.includes('Content Security Policy')) {
      cspConsoleErrors.push(text);
    }
  });

  const rootResponse = await page.goto('/');
  expect(rootResponse?.headers()['content-security-policy']).toContain("default-src 'self'");
  await expect(
    page.getByRole('heading', { name: 'React Server Components on Rails, without moving your app to a JS server.' }),
  ).toBeVisible();

  await signIn(page, email);
  const dashboardResponse = await page.goto('/dashboard');
  const dashboardCsp = dashboardResponse?.headers()['content-security-policy'];

  expect(dashboardCsp).toContain("script-src 'self' 'nonce-");
  await expect(page.locator('main.tanstack-shell').getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  expect(cspConsoleErrors).toEqual([]);
});
