import { execFileSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';
import { seedUser, signIn } from './support/auth';
import { preparePlaywrightAssets } from './support/rails';

const email = 'route-matrix-playwright@example.com';
const railsTestEnv = { ...process.env, RAILS_ENV: 'test' };
let projectId: string;
let projectName: string;

function railsRunnerOutput(script: string) {
  return execFileSync('bin/rails', ['runner', script], {
    encoding: 'utf8',
    env: railsTestEnv,
  }).trim();
}

async function expectHydratedShell(page: Page) {
  await expect(dashboardShell(page)).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Loading route...');
}

function dashboardShell(page: Page) {
  return page.locator('main.tanstack-shell').last();
}

test.beforeAll(() => {
  preparePlaywrightAssets();
  seedUser({
    email,
    name: 'Route Matrix',
    projects: {
      count: 3,
      description: 'Route matrix hydration coverage',
      namePrefix: 'Route Matrix Project',
    },
  });
  const project = JSON.parse(railsRunnerOutput(`
    project = User.find_by!(email_address: ${JSON.stringify(email)}).projects.order(:created_at).first
    puts({ id: project.id, name: project.name }.to_json)
  `));

  projectId = String(project.id);
  projectName = project.name;
});

test('Rails-owned TanStack routes direct-load and hydrate across the route matrix', async ({ page }) => {
  const consoleErrors: string[] = [];
  let documentRequests = 0;

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('request', (request) => {
    if (request.resourceType() === 'document') documentRequests += 1;
  });

  await signIn(page, email);

  const routes: Array<{
    path: string;
    assertRoute: (page: Page) => Promise<void>;
  }> = [
    {
      path: '/dashboard',
      assertRoute: async (routePage) => {
        const shell = dashboardShell(routePage);
        await expect(shell.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
        await expect(shell.locator('.metric-card')).toHaveCount(4);
        await expect(routePage.locator('body')).not.toContainText('Loading projects...');
      },
    },
    {
      path: '/projects',
      assertRoute: async (routePage) => {
        const shell = dashboardShell(routePage);
        await expect(shell.getByRole('heading', { name: 'Projects' })).toBeVisible();
        await expect(routePage.getByLabel('Status')).toBeVisible();
        await expect(routePage.locator('body')).not.toContainText('Loading projects...');
      },
    },
    {
      path: '/projects/new',
      assertRoute: async (routePage) => {
        await expect(dashboardShell(routePage).getByRole('heading', { name: 'New project' })).toBeVisible();
        await expect(routePage.getByRole('button', { name: 'Create project' })).toBeVisible();
      },
    },
    {
      path: `/projects/${projectId}`,
      assertRoute: async (routePage) => {
        await expect(dashboardShell(routePage).getByRole('heading', { name: projectName })).toBeVisible();
        await expect(routePage.getByText('Route matrix hydration coverage')).toBeVisible();
        await expect(routePage.locator('body')).not.toContainText('Loading project...');
      },
    },
    {
      path: `/projects/${projectId}/edit`,
      assertRoute: async (routePage) => {
        await expect(dashboardShell(routePage).getByRole('heading', { name: 'Edit project' })).toBeVisible();
        await expect(routePage.getByRole('button', { name: 'Save project' })).toBeVisible();
        await expect(routePage.locator('body')).not.toContainText('Loading project...');
      },
    },
    {
      path: '/settings',
      assertRoute: async (routePage) => {
        const shell = dashboardShell(routePage);
        await expect(shell.getByRole('heading', { name: 'Settings' })).toBeVisible();
        await expect(shell.getByRole('heading', { name: 'Route Matrix' })).toBeVisible();
      },
    },
    {
      path: '/settings/profile',
      assertRoute: async (routePage) => {
        await expect(dashboardShell(routePage).getByRole('heading', { name: 'Settings' })).toBeVisible();
        await expect(routePage.getByLabel('Name')).toHaveValue('Route Matrix');
        await expect(routePage.getByRole('button', { name: 'Save profile' })).toBeVisible();
      },
    },
    {
      path: '/settings/security',
      assertRoute: async (routePage) => {
        const shell = dashboardShell(routePage);
        await expect(shell.getByRole('heading', { name: 'Settings' })).toBeVisible();
        await expect(shell.getByRole('heading', { name: 'Password' })).toBeVisible();
        await expect(routePage.getByRole('link', { name: 'Send reset link' })).toHaveAttribute('href', '/passwords/new');
      },
    },
  ];

  for (const route of routes) {
    const response = await page.goto(route.path);

    expect(response?.ok()).toBeTruthy();
    await expectHydratedShell(page);
    await route.assertRoute(page);
  }

  await page.goto('/settings');
  await expectHydratedShell(page);

  const documentRequestsBeforeClientNavigation = documentRequests;
  await page.locator('nav[aria-label="Settings tabs"] a[href="/settings/profile"]').click();
  await expect(page).toHaveURL('/settings/profile');
  await expect(page.getByRole('button', { name: 'Save profile' })).toBeVisible();
  await page.locator('nav[aria-label="Settings tabs"] a[href="/settings/security"]').click();
  await expect(page).toHaveURL('/settings/security');
  await expect(page.getByRole('link', { name: 'Send reset link' })).toBeVisible();

  expect(documentRequests).toBe(documentRequestsBeforeClientNavigation);
  expect(consoleErrors).toEqual([]);
});
