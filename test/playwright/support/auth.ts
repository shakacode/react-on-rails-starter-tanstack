import type { Page } from '@playwright/test';
import { runRailsRunner } from './rails';

export const testPassword = 'password';

type ExpectedURL = string | RegExp | ((url: URL) => boolean);

type SignInOptions = {
  expectedURL?: ExpectedURL;
  password?: string;
};

type ProjectSeedOptions = {
  count: number;
  description?: string;
  namePrefix?: string;
  reset?: boolean;
};

type SeedUserOptions = {
  email: string;
  name: string;
  password?: string;
  projects?: ProjectSeedOptions;
  verified?: boolean;
};

function rubyString(value: string) {
  return JSON.stringify(value);
}

export function seedUser(options: SeedUserOptions) {
  const password = options.password ?? testPassword;
  const verifiedAt = options.verified === false ? 'nil' : 'Time.current';
  const projects = options.projects;
  const projectNamePrefix = rubyString(projects?.namePrefix ?? 'Playwright Project');
  const resetProjects = projects && projects.reset !== false ? 'user.projects.destroy_all' : '';
  const projectSetup = projects
    ? `
        ${resetProjects}
        ${projects.count}.times do |index|
          user.projects.create!(
            name: ${projectNamePrefix} + " #{index + 1}",
            description: ${rubyString(projects.description ?? 'Playwright coverage')},
            status: Project.statuses.keys[index % Project.statuses.size],
            last_activity_at: index.hours.ago
          )
        end
      `
    : '';

  runRailsRunner(`
    user = User.find_or_initialize_by(email_address: ${rubyString(options.email)})
    user.update!(
      name: ${rubyString(options.name)},
      password: ${rubyString(password)},
      password_confirmation: ${rubyString(password)},
      email_verified_at: ${verifiedAt}
    )
    ${projectSetup}
  `);
}

export async function submitSignInForm(page: Page, email: string, options: SignInOptions = {}) {
  const { expectedURL = '/dashboard', password = testPassword } = options;

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await Promise.all([
    page.waitForURL(expectedURL),
    page.getByRole('button', { name: 'Sign in' }).click(),
  ]);
}

export async function signIn(page: Page, email: string, options: SignInOptions = {}) {
  await page.goto('/session/new');
  await submitSignInForm(page, email, options);
}
