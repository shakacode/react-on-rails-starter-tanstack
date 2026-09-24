import { execFileSync } from 'node:child_process';
import { expect, test, type Page, type Request } from '@playwright/test';
import { seedUser, signIn } from './support/auth';
import { preparePlaywrightAssets } from './support/rails';

const email = 'navigation-lab-playwright@example.com';
const railsTestEnv = { ...process.env, RAILS_ENV: 'test' };
const projectIds: Record<string, string> = {};

// Seeded statuses cycle active, paused, completed, archived, so Lab Project 1 and
// Lab Project 5 share the active status and appear as each other's related projects.
test.beforeAll(() => {
  preparePlaywrightAssets();
  seedUser({
    email,
    name: 'Navigation Lab',
    projects: {
      count: 6,
      description: 'Navigation lab coverage',
      namePrefix: 'Lab Project',
    },
  });
  const projects = JSON.parse(execFileSync('bin/rails', ['runner', `
    user = User.find_by!(email_address: ${JSON.stringify(email)})
    puts(user.projects.to_h { |project| [project.name, project.id.to_s] }.to_json)
  `], { encoding: 'utf8', env: railsTestEnv }).trim());

  Object.assign(projectIds, projects);
});

function labShell(page: Page) {
  return page.locator('main.tanstack-shell');
}

function detailRequestsFor(requests: Request[], projectId: string) {
  return requests.filter((request) => new URL(request.url()).pathname === `/api/projects/${projectId}`);
}

function recordProjectDetailRequests(page: Page) {
  const requests: Request[] = [];
  page.on('request', (request) => {
    if (/^\/api\/projects\/\d+$/.test(new URL(request.url()).pathname)) requests.push(request);
  });

  return requests;
}

async function openLab(page: Page) {
  await page.goto('/navigation-lab');
  await expect(labShell(page).getByRole('heading', { name: 'Instant Navigation Lab' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Lab Project 1', exact: true })).toBeVisible();
}

test('shell timer keeps its state across list, detail, related view, and back without a document reload', async ({ page }) => {
  const consoleErrors: string[] = [];
  let documentRequests = 0;

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('request', (request) => {
    if (request.resourceType() === 'document') documentRequests += 1;
  });

  await page.clock.install();
  await signIn(page, email);
  await openLab(page);

  const timer = page.getByRole('timer', { name: 'Focus timer' });
  await expect(timer).toHaveText('00:00');
  await page.getByRole('button', { name: 'Start focus timer' }).click();
  await page.clock.runFor(65_000);
  await page.getByRole('button', { name: 'Pause focus timer' }).click();
  const pausedAt = await timer.textContent();
  expect(pausedAt).toMatch(/^01:0\d$/);

  const documentRequestsBeforeNavigation = documentRequests;

  await page.getByRole('link', { name: 'Lab Project 1', exact: true }).click();
  await expect(page).toHaveURL(`/navigation-lab/projects/${projectIds['Lab Project 1']}`);
  await expect(labShell(page).getByRole('heading', { name: 'Lab Project 1', exact: true })).toBeVisible();

  const related = page.getByRole('navigation', { name: 'Related projects' });
  await related.getByRole('link', { name: 'Lab Project 5' }).click();
  await expect(page).toHaveURL(`/navigation-lab/projects/${projectIds['Lab Project 5']}`);
  await expect(labShell(page).getByRole('heading', { name: 'Lab Project 5', exact: true })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(`/navigation-lab/projects/${projectIds['Lab Project 1']}`);
  await expect(labShell(page).getByRole('heading', { name: 'Lab Project 1', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL('/navigation-lab');
  await page.goForward();
  await expect(page).toHaveURL(`/navigation-lab/projects/${projectIds['Lab Project 1']}`);

  await expect(timer).toHaveText(pausedAt ?? '');
  await expect(page.getByRole('button', { name: 'Resume focus timer' })).toBeVisible();
  expect(documentRequests).toBe(documentRequestsBeforeNavigation);

  await page.getByRole('button', { name: 'Resume focus timer' }).click();
  await page.getByRole('link', { name: 'All lab projects' }).click();
  await expect(page).toHaveURL('/navigation-lab');
  await page.clock.runFor(10_000);
  await expect(page.getByRole('button', { name: 'Pause focus timer' })).toBeVisible();
  await expect(timer).not.toHaveText(pausedAt ?? '');
  expect(documentRequests).toBe(documentRequestsBeforeNavigation);
  expect(consoleErrors).toEqual([]);
});

test('lab URLs direct-load, refresh, and still require sign in', async ({ page }) => {
  const detailPath = `/navigation-lab/projects/${projectIds['Lab Project 5']}`;

  await page.goto(detailPath);
  await expect(page).toHaveURL('/session/new');

  await signIn(page, email, { expectedURL: detailPath });
  await expect(labShell(page).getByRole('heading', { name: 'Lab Project 5', exact: true })).toBeVisible();
  await expect(page.getByRole('timer', { name: 'Focus timer' })).toHaveText('00:00');

  await page.reload();
  await expect(labShell(page).getByRole('heading', { name: 'Lab Project 5', exact: true })).toBeVisible();
  await expect(page.getByText('Fetched after navigation')).toBeVisible();

  await page.goto('/navigation-lab');
  await expect(page.getByRole('link', { name: 'Lab Project 1', exact: true })).toBeVisible();
});

test('intent prefetch loads one project on hover and the click reuses that cache entry', async ({ page }) => {
  await signIn(page, email);
  const detailRequests = recordProjectDetailRequests(page);
  await openLab(page);

  // The list renders six project links but requests no project details up front.
  await expect(page.getByRole('link', { name: /^Lab Project \d$/ })).toHaveCount(6);
  expect(detailRequests).toEqual([]);

  const projectId = projectIds['Lab Project 2'];
  await page.getByRole('link', { name: 'Lab Project 2', exact: true }).hover();
  await expect(page.getByRole('list', { name: 'Lab request log' })).toContainText('Prefetched Lab Project 2');
  expect(detailRequestsFor(detailRequests, projectId)).toHaveLength(1);

  await page.getByRole('link', { name: 'Lab Project 2', exact: true }).click();
  await expect(labShell(page).getByRole('heading', { name: 'Lab Project 2', exact: true })).toBeVisible();
  await expect(page.getByText('Rendered from cached data')).toBeVisible();
  expect(detailRequestsFor(detailRequests, projectId)).toHaveLength(1);
  expect(detailRequests).toHaveLength(1);
});

test('with prefetch off, hover requests nothing and the delayed route shows a pending state', async ({ page }) => {
  await signIn(page, email);
  const detailRequests = recordProjectDetailRequests(page);
  await openLab(page);

  await page.getByRole('checkbox', { name: 'Prefetch on hover or focus' }).uncheck();
  await page.getByLabel('Artificial latency').selectOption('1500');

  const projectLink = page.getByRole('link', { name: 'Lab Project 3', exact: true });
  await projectLink.hover();
  await projectLink.focus();
  // A negative network assertion needs a window; the prefetch path above fires on hover.
  await page.waitForTimeout(300);
  expect(detailRequests).toEqual([]);

  await projectLink.click();
  await expect(page.getByText('Loading project...')).toBeVisible();
  await expect(labShell(page).getByRole('heading', { name: 'Lab Project 3', exact: true })).toBeVisible();
  await expect(page.getByText('Fetched after navigation')).toBeVisible();
  expect(detailRequestsFor(detailRequests, projectIds['Lab Project 3'])).toHaveLength(1);
});

test('rapid successive navigation never shows an earlier project under a later URL', async ({ page }) => {
  await signIn(page, email);
  const detailRequests = recordProjectDetailRequests(page);
  await openLab(page);

  await page.getByRole('checkbox', { name: 'Prefetch on hover or focus' }).uncheck();
  await page.getByLabel('Artificial latency').selectOption('1500');

  await page.getByRole('link', { name: 'Lab Project 4', exact: true }).click();
  await expect(page.getByText('Loading project...')).toBeVisible();
  await page.goBack();
  await page.getByRole('link', { name: 'Lab Project 6', exact: true }).click();

  const laterPath = `/navigation-lab/projects/${projectIds['Lab Project 6']}`;
  await expect(page).toHaveURL(laterPath);
  await expect(labShell(page).getByRole('heading', { name: 'Lab Project 6', exact: true })).toBeVisible();

  // Let the abandoned Lab Project 4 request settle, then confirm it did not replace the view.
  await expect.poll(() => detailRequestsFor(detailRequests, projectIds['Lab Project 4']).length).toBe(1);
  await detailRequestsFor(detailRequests, projectIds['Lab Project 4'])[0].response();
  await expect(page).toHaveURL(laterPath);
  await expect(labShell(page).getByRole('heading', { name: 'Lab Project 4', exact: true })).toHaveCount(0);
  await expect(labShell(page).getByRole('heading', { name: 'Lab Project 6', exact: true })).toBeVisible();
});

test('a failed project read shows a recoverable error with retry', async ({ page }) => {
  await signIn(page, email);
  await openLab(page);
  await page.getByRole('checkbox', { name: 'Prefetch on hover or focus' }).uncheck();

  const projectPath = `/api/projects/${projectIds['Lab Project 1']}`;
  // The shared Query policy retries once, so fail both attempts of the first read.
  let failuresLeft = 2;
  await page.route(`**${projectPath}`, async (route) => {
    if (failuresLeft > 0) {
      failuresLeft -= 1;
      await route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Lab outage"}' });
      return;
    }

    await route.continue();
  });

  await page.getByRole('link', { name: 'Lab Project 1', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Lab outage');

  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(labShell(page).getByRole('heading', { name: 'Lab Project 1', exact: true })).toBeVisible();
});
