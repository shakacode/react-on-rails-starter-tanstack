import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { preparePlaywrightAssets } from './support/rails';

const railsTestEnv = { ...process.env, RAILS_ENV: 'test' };

function railsRunnerOutput(script: string) {
  return execFileSync('bin/rails', ['runner', script], {
    encoding: 'utf8',
    env: railsTestEnv,
  }).trim();
}

test.beforeAll(() => {
  preparePlaywrightAssets();
});

test.describe('classic auth views', () => {
  test('sign in keeps the demo credential contract and accessible fields', async ({ page }) => {
    await page.goto('/session/new');

    await expect(page.locator('main')).toHaveClass(/bg-muted\/40/);
    await expect(page.locator('section').filter({ hasText: 'Sign in' })).toHaveClass(/bg-card/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByText('demo@example.com')).toBeVisible();
    await expect(page.getByText('password', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveAttribute('autocomplete', 'username');
    await expect(page.getByLabel('Password')).toHaveAttribute('autocomplete', 'current-password');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();

    await page.getByLabel('Email').fill('missing@example.com');
    await page.getByLabel('Password').fill('wrong-password');
    await Promise.all([
      page.waitForURL('/session/new'),
      page.getByRole('button', { name: 'Sign in' }).click(),
    ]);
    await expect(page.getByText('Try another email address or password.')).toBeVisible();
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

    const token = railsRunnerOutput(`
      user = User.find_or_initialize_by(email_address: "auth-reset-playwright@example.com")
      user.update!(name: "Auth Reset", password: "password", password_confirmation: "password", email_verified_at: Time.current)
      puts user.password_reset_token
    `);
    await page.goto(`/passwords/${encodeURIComponent(token)}/edit`);

    await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
    await expect(page.getByLabel('New password', { exact: true })).toHaveAttribute('autocomplete', 'new-password');
    await expect(page.getByLabel('Confirm new password')).toHaveAttribute('autocomplete', 'new-password');
  });

  test('email verification screens keep resend and recovery affordances', async ({ page }) => {
    await page.goto('/email_verifications/sent');

    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Resend verification link|Resend available in/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Change email' })).toHaveAttribute('href', '/signup');
    await expect(page.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/session/new');

    await page.goto('/email_verifications/expired');

    await expect(page.getByRole('heading', { name: 'Verification link expired' })).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveAttribute('autocomplete', 'email');
    await expect(page.getByRole('button', { name: 'Send a new link' })).toBeVisible();
  });
});
