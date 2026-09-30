import { execFileSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';
import { seedUser, signIn } from './support/auth';
import { preparePlaywrightAssets } from './support/rails';

const email = 'navigation-lab-edit-playwright@example.com';
const railsTestEnv = { ...process.env, RAILS_ENV: 'test' };
let projectIds: Record<string, string> = {};

test.beforeAll(() => {
  preparePlaywrightAssets();
});

// Each test renames projects, so reseed a fresh set and read the new ids.
test.beforeEach(() => {
  seedUser({
    email,
    name: 'Navigation Lab Edit',
    projects: { count: 4, description: 'Navigation lab edit coverage', namePrefix: 'Edit Project' },
  });
  projectIds = JSON.parse(execFileSync('bin/rails', ['runner', `
    user = User.find_by!(email_address: ${JSON.stringify(email)})
    puts(user.projects.to_h { |project| [project.name, project.id.to_s] }.to_json)
  `], { encoding: 'utf8', env: railsTestEnv }).trim());
});

function labShell(page: Page) {
  return page.locator('main.tanstack-shell');
}

test('saving on the ordinary edit page refreshes a cached lab detail', async ({ page }) => {
  await signIn(page, email);
  await page.goto('/navigation-lab');
  await page.getByRole('link', { name: 'Edit Project 4', exact: true }).click();
  await expect(labShell(page).getByRole('heading', { name: 'Edit Project 4', exact: true })).toBeVisible();

  await page.locator('nav[aria-label="Dashboard navigation"] a[href="/projects"]').click();
  await page.locator(`a[href="/projects/${projectIds['Edit Project 4']}/edit"]`).click();
  await page.getByLabel('Name').fill('Edited Outside The Lab');
  await page.getByRole('button', { name: 'Save project' }).click();
  await expect(page).toHaveURL(`/projects/${projectIds['Edit Project 4']}`);

  // The cached lab detail is still inside its 30s staleTime, so only the save's
  // own cache write can show the new name here.
  await page.locator('nav[aria-label="Dashboard navigation"] a[href="/navigation-lab"]').click();
  await page.getByRole('link', { name: 'Edited Outside The Lab', exact: true }).click();
  await expect(labShell(page).getByRole('heading', { name: 'Edited Outside The Lab', exact: true })).toBeVisible();
  await expect(labShell(page).getByRole('heading', { name: 'Edit Project 4', exact: true })).toHaveCount(0);
});
