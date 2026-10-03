import { expect, test } from '@playwright/test';
import { preparePlaywrightAssets } from './support/rails';

test.beforeAll(() => {
  preparePlaywrightAssets();
});

test('public RSC showcase route loads the TanStack composition surface', async ({ page }) => {
  await page.goto('/rsc-showcase');

  await expect(
    page.getByRole('heading', { name: 'Working RSC payloads with hydrated client islands' }),
  ).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'RSC showcase navigation' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
  await expect(page.getByRole('link', { name: 'Source' })).toHaveAttribute(
    'href',
    'https://github.com/shakacode/react-on-rails-starter-tanstack',
  );
  await expect(page.locator('footer').getByText(/Commit [0-9a-f]{7}/i)).toBeVisible();
  await expect(page.getByRole('region', { name: 'RSC capability status' })).toBeVisible();
  await expect(page.getByText('RSC payload route')).toBeVisible();
  await expect(page.getByText('Streaming RSC shell')).toBeVisible();
  await expect(page.getByText('Streaming client island')).toBeVisible();

  const rspackFallback = page.getByText('RSC manifests are not available for this build.');

  if (await rspackFallback.isVisible().catch(() => false)) {
    await expect(page.getByText('bin/shakapacker')).toBeVisible();
    return;
  }

  await expect(page.getByText('RSC streamed by Rails, consumed by a TanStack route')).toBeVisible();
  await expect(page.getByText('Server payload proof')).toBeVisible();
  await expect(page.getByText('Server panel JS shipped')).toBeVisible();
  await expect(page.getByText('Payload helper')).toBeVisible();

  const prefetchResponsePromise = page.waitForResponse((response) => {
    const responseUrl = new URL(response.url());

    return responseUrl.pathname.endsWith('/rsc_payload/RscShowcaseServerPanel') && response.request().method() === 'GET';
  });
  await page.getByRole('button', { name: 'Prefetch payload' }).click();
  const prefetchResponse = await prefetchResponsePromise;

  expect(prefetchResponse.ok()).toBeTruthy();
  await expect(page.getByRole('button', { name: 'Prefetch completed' })).toBeVisible();

  await page.getByRole('button', { name: 'Hydrated island' }).click();
  await expect(page.getByText('2 client clicks inside the fetched RSC payload')).toBeVisible();

  await page.getByRole('button', { name: 'Pulse client state' }).click();
  await expect(page.getByText('1 route pulse')).toBeVisible();
});


test('streamed LikeButton waits for hydration before accepting clicks', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('/hello_server');
    await expect(page.getByRole('button', { name: '👍 Like', exact: true })).toBeDisabled();
  } finally {
    await context.close();
  }
});

test('streamed LikeButton hydrates and responds under nonce CSP', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const response = await page.goto('/hello_server');
  const csp = response?.headers()['content-security-policy'] ?? '';
  const scriptPolicy = csp.split(';').find((policy) => policy.trim().startsWith('script-src ')) ?? '';
  expect(scriptPolicy).toMatch(/'nonce-[^']+'/);
  expect(scriptPolicy).not.toContain("'unsafe-inline'");
  const like = page.getByRole('button', { name: '👍 Like', exact: true });
  await like.click();
  await expect(page.getByText('1 like', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
