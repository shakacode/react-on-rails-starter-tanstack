import { expect, test } from '@playwright/test';
import { seedUser, signIn, submitSignInForm } from './support/auth';
import { preparePlaywrightAssets } from './support/rails';

const email = 'tanstack-playwright@example.com';
const emptyEmail = 'tanstack-empty-playwright@example.com';

test.beforeAll(() => {
  preparePlaywrightAssets();
  seedUser({
    email,
    name: 'TanStack Playwright',
    projects: {
      count: 12,
      description: 'Dashboard regression coverage',
      namePrefix: 'Playwright Project',
    },
  });
  seedUser({
    email: emptyEmail,
    name: 'TanStack Empty',
    projects: {
      count: 0,
    },
  });
});

test('protected TanStack route returns to URL-backed table state after sign in', async ({ page }) => {
  await page.goto('/projects?status=paused&sort=name&dir=desc');
  await expect(page).toHaveURL('/session/new');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  await submitSignInForm(page, email, {
    expectedURL: (url) =>
      url.pathname === '/projects' &&
      url.searchParams.get('status') === 'paused' &&
      url.searchParams.get('sort') === 'name' &&
      url.searchParams.get('dir') === 'desc',
  });

  const shell = page.locator('main.tanstack-shell');
  await expect(shell.getByRole('heading', { name: 'Projects' })).toBeVisible();
  await expect(page.locator('nav[aria-label="Dashboard navigation"] a[href="/projects/new"]')).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(page.getByLabel('Status')).toHaveValue('paused');
  await expect(shell.getByRole('cell', { name: 'paused' }).first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Loading projects...');
});

test('authenticated dashboard hydrates client routes and project mutations', async ({ page }) => {
  test.setTimeout(60_000);

  const consoleErrors: string[] = [];
  let documentRequests = 0;

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('request', (request) => {
    if (request.resourceType() === 'document') documentRequests += 1;
  });

  await signIn(page, email);

  await page.goto('/projects/new');
  await expect(page.locator('main.tanstack-shell').getByRole('heading', { name: 'New project' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open classic Rails form' })).toHaveAttribute('href', '/classic/projects/new');

  await page.goto('/projects?status=active&sort=name&dir=asc');
  const shell = page.locator('main.tanstack-shell');
  await expect(shell.getByRole('heading', { name: 'Projects' })).toBeVisible();
  await expect(shell.getByRole('heading', { name: 'Project list' })).toBeVisible();
  await expect(shell.getByRole('link', { name: 'Playwright Project 1' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Loading projects...');
  expect(page.url()).toContain('status=active');
  expect(page.url()).toContain('sort=name');
  expect(page.url()).toContain('dir=asc');

  const documentRequestsBeforeClientRoutes = documentRequests;
  await page.locator('nav[aria-label="Dashboard navigation"] a[href="/settings"]').click();
  await expect(page).toHaveURL('/settings');
  await page.locator('nav[aria-label="Settings tabs"] a[href="/settings/profile"]').click();
  await expect(page).toHaveURL('/settings/profile');
  await page.getByLabel('Name').fill('TanStack Playwright Updated');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Profile updated.')).toBeVisible();
  await page.locator('nav[aria-label="Settings tabs"] a[href="/settings"]').click();
  await expect(page.getByRole('heading', { name: 'TanStack Playwright Updated' })).toBeVisible();
  await page.locator('nav[aria-label="Dashboard navigation"] a[href="/dashboard"]').click();
  await expect(page).toHaveURL('/dashboard');
  await expect(shell.getByRole('heading', { name: 'Rails-owned app shell with React where it pays off' })).toBeVisible();
  await expect(shell.locator('.metric-card')).toHaveCount(4);
  await expect(page.locator('body')).not.toContainText('Your email is verified.');
  expect(documentRequests).toBe(documentRequestsBeforeClientRoutes);

  await page.getByRole('button', { name: 'Rendering mode details' }).click();
  const renderingDialog = page.getByRole('dialog', { name: 'Rendering on this page' });
  await expect(renderingDialog).toBeVisible();
  await expect(
    renderingDialog.getByRole('heading', { name: 'The public RSC showcase (/rsc-showcase) - RSC composed inside TanStack.' }),
  ).toBeVisible();
  await expect(renderingDialog.getByRole('link', { name: 'Open RSC showcase' })).toHaveAttribute('href', '/rsc-showcase');
  await page.keyboard.press('Escape');
  await expect(renderingDialog).toBeHidden();

  await page.getByRole('link', { name: 'Create project' }).click();
  await expect(page).toHaveURL('/projects/new');
  const projectName = `Playwright Created ${Date.now()}`;
  await page.getByLabel('Name').fill(projectName);
  await page.getByLabel('Description').fill('Created through TanStack client route');
  await page.getByLabel('Status').selectOption('paused');
  await Promise.all([
    page.waitForURL(/\/projects\/\d+$/),
    page.getByRole('button', { name: 'Create project' }).click(),
  ]);
  await expect(page.getByRole('heading', { name: projectName })).toBeVisible();
  const projectUrl = page.url();
  await page.reload();
  await expect(page).toHaveURL(projectUrl);
  await expect(page.locator('main.tanstack-shell').getByRole('heading', { name: projectName })).toBeVisible();

  await page.getByRole('link', { name: 'Edit' }).click();
  await expect(page).toHaveURL(/\/projects\/\d+\/edit$/);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Save project' })).toBeVisible();
  await page.getByLabel('Description').fill('Edited through TanStack client route');
  await Promise.all([
    page.waitForURL(/\/projects\/\d+$/),
    page.getByRole('button', { name: 'Save project' }).click(),
  ]);
  await expect(page.getByText('Edited through TanStack client route')).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('first project creation enables metrics without a reload', async ({ page }) => {
  await signIn(page, emptyEmail);

  await page.goto('/dashboard');
  await expect(page.locator('.metric-card').first().locator('strong')).toHaveText('0');
  await expect(page.getByText('Create a project to populate metrics.')).toHaveCount(4);

  await page.getByRole('link', { name: 'Create project' }).click();
  await page.getByLabel('Name').fill('Playwright First Project');
  await page.getByLabel('Description').fill('Created as the first project');
  await page.getByLabel('Status').selectOption('active');
  await Promise.all([
    page.waitForURL(/\/projects\/\d+$/),
    page.getByRole('button', { name: 'Create project' }).click(),
  ]);

  await page.locator('nav[aria-label="Dashboard navigation"] a[href="/dashboard"]').click();
  await expect(page.locator('.metric-card').first().locator('strong')).toHaveText('1');
  await expect(page.getByText('Create a project to populate metrics.')).toHaveCount(0);
});
