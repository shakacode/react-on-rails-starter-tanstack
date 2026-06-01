import { execFileSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';
import { signIn } from './support/auth';
import { preparePlaywrightAssets } from './support/rails';

const email = 'visual-route-playwright@example.com';
const railsTestEnv = { ...process.env, RAILS_ENV: 'test' };
let projectId: string;
let projectName: string;

function railsRunnerOutput(script: string) {
  return execFileSync('bin/rails', ['runner', script], {
    encoding: 'utf8',
    env: railsTestEnv,
  }).trim();
}

async function prepareVisualPage(page: Page) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
}

async function expectRouteScreenshot(page: Page, name: string) {
  await page.addStyleTag({ path: 'test/playwright/support/visual-snapshot.css' });
  await expect(page.locator('body')).not.toContainText(/Loading (projects?|route)\.\.\.|Loading the RSC payload/);
  await expect(page).toHaveScreenshot(name, { fullPage: false });
}

test.beforeAll(() => {
  preparePlaywrightAssets();
  const project = JSON.parse(railsRunnerOutput(`
    user = User.find_or_initialize_by(email_address: ${JSON.stringify(email)})
    user.update!(
      name: "Visual Route",
      password: "password",
      password_confirmation: "password",
      email_verified_at: Time.current
    )

    user.projects.destroy_all
    base_time = Time.zone.parse("2026-01-15 12:00:00 UTC")
    statuses = %w[active paused completed archived active paused completed archived]

    statuses.each_with_index do |status, index|
      user.projects.create!(
        name: "Visual Project #{index + 1}",
        description: "Visual route screenshot coverage #{index + 1}",
        status: status,
        created_at: base_time - (index + 10).days,
        updated_at: base_time - index.days,
        last_activity_at: base_time - index.days
      )
    end

    project = user.projects.order(:created_at).first
    puts({ id: project.id, name: project.name }.to_json)
  `));

  projectId = String(project.id);
  projectName = project.name;
});

test.describe('route visual screenshots @visual', () => {
  test('public pages keep their first viewport layout stable', async ({ page }) => {
    await prepareVisualPage(page);

    const routes: Array<{
      path: string;
      screenshot: string;
      assertReady: (routePage: Page) => Promise<void>;
    }> = [
      {
        path: '/',
        screenshot: 'public-home.png',
        assertReady: async (routePage) => {
          await expect(routePage.getByRole('heading', { name: 'React Server Components on Rails, without moving your app to a JS server.' })).toBeVisible();
        },
      },
      {
        path: '/rsc-showcase',
        screenshot: 'public-rsc-showcase.png',
        assertReady: async (routePage) => {
          await expect(routePage.getByRole('heading', { name: 'Server-streamed RSC composed inside a TanStack route on Rails' })).toBeVisible();
          await expect(routePage.getByText(/RSC streamed by Rails|RSC manifests are not available/)).toBeVisible();
        },
      },
      {
        path: '/session/new',
        screenshot: 'public-sign-in.png',
        assertReady: async (routePage) => {
          await expect(routePage.getByRole('heading', { name: 'Sign in' })).toBeVisible();
        },
      },
      {
        path: '/signup',
        screenshot: 'public-sign-up.png',
        assertReady: async (routePage) => {
          await expect(routePage.getByRole('heading', { name: 'Create your account' })).toBeVisible();
        },
      },
      {
        path: '/passwords/new',
        screenshot: 'public-password-reset.png',
        assertReady: async (routePage) => {
          await expect(routePage.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
        },
      },
    ];

    for (const route of routes) {
      await test.step(route.path, async () => {
        await page.goto(route.path);
        await route.assertReady(page);
        await expectRouteScreenshot(page, route.screenshot);
      });
    }
  });

  test('authenticated dashboard routes keep their first viewport layout stable', async ({ page }) => {
    await prepareVisualPage(page);
    await signIn(page, email);

    const routes: Array<{
      path: string;
      screenshot: string;
      assertReady: (routePage: Page) => Promise<void>;
    }> = [
      {
        path: '/dashboard',
        screenshot: 'dashboard-overview.png',
        assertReady: async (routePage) => {
          const shell = routePage.locator('main.tanstack-shell');
          await expect(shell.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
          await expect(shell.locator('.metric-card')).toHaveCount(4);
        },
      },
      {
        path: '/projects?status=active&sort=name&dir=asc',
        screenshot: 'dashboard-projects-index.png',
        assertReady: async (routePage) => {
          await expect(routePage.locator('main.tanstack-shell').getByRole('heading', { name: 'Project list' })).toBeVisible();
          await expect(routePage.getByLabel('Status')).toHaveValue('active');
        },
      },
      {
        path: '/projects/new',
        screenshot: 'dashboard-projects-new.png',
        assertReady: async (routePage) => {
          await expect(routePage.locator('main.tanstack-shell').getByRole('heading', { name: 'New project' })).toBeVisible();
          await expect(routePage.getByRole('button', { name: 'Create project' })).toBeVisible();
        },
      },
      {
        path: `/projects/${projectId}`,
        screenshot: 'dashboard-projects-show.png',
        assertReady: async (routePage) => {
          await expect(routePage.locator('main.tanstack-shell').getByRole('heading', { name: projectName })).toBeVisible();
        },
      },
      {
        path: `/projects/${projectId}/edit`,
        screenshot: 'dashboard-projects-edit.png',
        assertReady: async (routePage) => {
          await expect(routePage.locator('main.tanstack-shell').getByRole('heading', { name: 'Edit project' })).toBeVisible();
          await expect(routePage.getByRole('button', { name: 'Save project' })).toBeVisible();
        },
      },
      {
        path: '/settings',
        screenshot: 'dashboard-settings.png',
        assertReady: async (routePage) => {
          const shell = routePage.locator('main.tanstack-shell');
          await expect(shell.getByRole('heading', { name: 'Settings' })).toBeVisible();
          await expect(shell.getByRole('heading', { name: 'Visual Route' })).toBeVisible();
        },
      },
      {
        path: '/settings/profile',
        screenshot: 'dashboard-settings-profile.png',
        assertReady: async (routePage) => {
          await expect(routePage.locator('main.tanstack-shell').getByRole('heading', { name: 'Settings' })).toBeVisible();
          await expect(routePage.getByLabel('Name')).toHaveValue('Visual Route');
        },
      },
      {
        path: '/settings/security',
        screenshot: 'dashboard-settings-security.png',
        assertReady: async (routePage) => {
          await expect(routePage.locator('main.tanstack-shell').getByRole('heading', { name: 'Password' })).toBeVisible();
          await expect(routePage.getByRole('link', { name: 'Send reset link' })).toBeVisible();
        },
      },
    ];

    for (const route of routes) {
      await test.step(route.path, async () => {
        await page.goto(route.path);
        await route.assertReady(page);
        await expectRouteScreenshot(page, route.screenshot);
      });
    }
  });
});
