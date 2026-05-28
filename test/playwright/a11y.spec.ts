import { expect, test } from '@playwright/test';
import { seedUser, signIn } from './support/auth';
import { preparePlaywrightAssets } from './support/rails';

const email = 'a11y-playwright@example.com';

test.beforeAll(() => {
  preparePlaywrightAssets();
  seedUser({
    email,
    name: 'Accessibility Playwright',
    projects: {
      count: 2,
      description: 'Accessibility smoke coverage',
      namePrefix: 'Accessibility Project',
    },
  });
});

test.describe('accessibility smoke', () => {
  test('public landing exposes landmarks, headings, and named links @a11y', async ({ page }) => {
    await page.goto('/');

    const main = page.locator('main');
    const hero = main.locator('.hero');

    await expect(main).toBeVisible();
    await expect(
      main.getByRole('heading', {
        level: 1,
        name: 'react_on_rails_starter_tanstack is ready.',
      }),
    ).toBeVisible();
    await expect(hero.getByRole('link', { name: 'Open RSC demo' })).toHaveAttribute('href', '/hello_server');
    await expect(hero.getByRole('link', { name: 'Open the docs' })).toHaveAttribute(
      'href',
      'https://reactonrails.com/docs/pro/react-server-components/',
    );
  });

  test('classic auth forms expose labels, autocomplete, and live errors @a11y', async ({ page }) => {
    await page.goto('/session/new');

    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveAttribute('autocomplete', 'username');
    await expect(page.getByLabel('Email')).toHaveAttribute('required', /^(|required)$/);
    await expect(page.getByLabel('Password')).toHaveAttribute('autocomplete', 'current-password');
    await expect(page.getByLabel('Password')).toHaveAttribute('required', /^(|required)$/);

    await page.getByLabel('Email').fill('missing-a11y@example.com');
    await page.getByLabel('Password').fill('wrong-password');
    await Promise.all([
      page.waitForURL('/session/new'),
      page.getByRole('button', { name: 'Sign in' }).click(),
    ]);
    await expect(page.locator('[aria-live="polite"]').getByText('Try another email address or password.')).toBeVisible();

    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await expect(page.getByLabel('Name')).toHaveAttribute('autocomplete', 'name');
    await expect(page.getByLabel('Email')).toHaveAttribute('autocomplete', 'email');
    await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('autocomplete', 'new-password');
    await expect(page.getByLabel('Confirm password')).toHaveAttribute('autocomplete', 'new-password');

    await page.goto('/passwords/new');
    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveAttribute('autocomplete', 'username');
  });

  test('dashboard shell exposes navigation, tabs, and dialog focus affordances @a11y', async ({ page }) => {
    await signIn(page, email);
    await page.goto('/dashboard');

    const shell = page.locator('main.tanstack-shell');
    const dashboardNav = page.locator('nav[aria-label="Dashboard navigation"]');

    await expect(shell.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(dashboardNav).toBeVisible();
    await expect(dashboardNav.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/projects');
    await expect(dashboardNav.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');

    await page.goto('/settings/profile');
    await expect(page.locator('nav[aria-label="Settings tabs"]')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/settings/profile');
    await expect(page.getByLabel('Name')).toHaveValue('Accessibility Playwright');

    await page.goto('/dashboard');
    const renderingModeButton = page.getByRole('button', { name: 'Rendering mode details' });
    await renderingModeButton.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Rendering on this page' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Rendering on this page' })).toBeHidden();
    await expect(renderingModeButton).toBeFocused();
  });
});
