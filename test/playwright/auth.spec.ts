import { expect, test } from '@playwright/test';

test.describe('classic auth views', () => {
  test('sign in keeps the demo credential contract and accessible fields', async ({ page }) => {
    await page.goto('/session/new');

    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByText('demo@example.com')).toBeVisible();
    await expect(page.getByText('password', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveAttribute('autocomplete', 'username');
    await expect(page.getByLabel('Password')).toHaveAttribute('autocomplete', 'current-password');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.locator('section').filter({ hasText: 'Sign in' })).toHaveClass(/bg-card/);
  });

  test('signup and password reset forms keep Rails form semantics', async ({ page }) => {
    await page.goto('/signup');

    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await expect(page.getByLabel('Name')).toHaveAttribute('autocomplete', 'name');
    await expect(page.getByLabel('Email')).toHaveAttribute('autocomplete', 'email');
    await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('autocomplete', 'new-password');
    await expect(page.getByLabel('Confirm password')).toHaveAttribute('autocomplete', 'new-password');

    await page.goto('/passwords/new');

    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveAttribute('autocomplete', 'username');
    await expect(page.getByRole('button', { name: 'Email reset instructions' })).toBeVisible();
  });
});
