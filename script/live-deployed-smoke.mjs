#!/usr/bin/env node

import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';

const defaultBaseURL = 'https://starter.reactonrails.com';
const baseURL = normalizeBaseURL(process.argv[2] || process.env.LIVE_DEPLOYED_SMOKE_URL || defaultBaseURL);
const email = process.env.LIVE_DEPLOYED_SMOKE_EMAIL || 'demo@example.com';
const password = process.env.LIVE_DEPLOYED_SMOKE_PASSWORD || 'password';
const expectedCommit = process.env.EXPECTED_DEPLOYED_COMMIT || process.env.LIVE_DEPLOYED_SMOKE_EXPECTED_COMMIT || null;
const headless = !['0', 'false', 'no'].includes(String(process.env.LIVE_DEPLOYED_SMOKE_HEADLESS || 'true').toLowerCase());
const timeoutMs = Number(process.env.LIVE_DEPLOYED_SMOKE_TIMEOUT_MS || 30_000);
const routeResults = [];
const diagnostics = {
  consoleErrors: [],
  failedRequests: [],
  pageErrors: [],
};

function usage() {
  console.error(`Usage: node script/live-deployed-smoke.mjs [base-url]

Environment:
  LIVE_DEPLOYED_SMOKE_URL              Base URL. Defaults to ${defaultBaseURL}.
  LIVE_DEPLOYED_SMOKE_EMAIL            Sign-in email. Defaults to demo@example.com.
  LIVE_DEPLOYED_SMOKE_PASSWORD         Sign-in password. Defaults to password.
  EXPECTED_DEPLOYED_COMMIT             Optional expected footer commit prefix or SHA.
  LIVE_DEPLOYED_SMOKE_EXPECTED_COMMIT  Alias for EXPECTED_DEPLOYED_COMMIT.
  LIVE_DEPLOYED_SMOKE_HEADLESS         Set to false to show the browser.
  LIVE_DEPLOYED_SMOKE_TIMEOUT_MS       Per-assertion timeout. Defaults to 30000.`);
}

function normalizeBaseURL(rawURL) {
  try {
    const url = new URL(rawURL);
    url.pathname = url.pathname.replace(/\/+$/, '');
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch (error) {
    usage();
    throw new Error(`Invalid deployed smoke base URL ${JSON.stringify(rawURL)}: ${error.message}`);
  }
}

function routeURL(path) {
  return new URL(path, `${baseURL}/`).toString();
}

function compactText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function responseSummary(response) {
  if (!response) return null;

  return {
    status: response.status(),
    statusText: response.statusText(),
    url: response.url(),
  };
}

function isSameOrigin(rawURL) {
  try {
    return new URL(rawURL).origin === new URL(baseURL).origin;
  } catch {
    return false;
  }
}

function recordBrowserDiagnostics(page) {
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    diagnostics.consoleErrors.push(message.text());
  });

  page.on('pageerror', (error) => {
    diagnostics.pageErrors.push(error.message);
  });

  page.on('requestfailed', (request) => {
    if (!isSameOrigin(request.url())) return;
    if (!['document', 'script', 'stylesheet'].includes(request.resourceType())) return;

    diagnostics.failedRequests.push({
      method: request.method(),
      resourceType: request.resourceType(),
      url: request.url(),
      failure: request.failure()?.errorText || null,
    });
  });
}

async function gotoRoute(page, path) {
  const response = await page.goto(routeURL(path), { waitUntil: 'domcontentloaded', timeout: timeoutMs });

  if (!response) {
    throw new Error(`${path} did not return a document response`);
  }

  if (!response.ok()) {
    throw new Error(`${path} returned ${response.status()} ${response.statusText()}`);
  }

  return response;
}

async function waitForVisible(locator, description) {
  try {
    await locator.waitFor({ state: 'visible', timeout: timeoutMs });
  } catch (error) {
    throw new Error(`Timed out waiting for ${description}: ${error.message}`);
  }
}

async function expectText(locator, pattern, description) {
  await waitForVisible(locator, description);
  const text = compactText(await locator.textContent());

  if (!pattern.test(text)) {
    throw new Error(`${description} text did not match ${pattern}: ${JSON.stringify(text)}`);
  }

  return text;
}

async function clickIfVisible(locator) {
  if (await locator.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await locator.click();
    return true;
  }

  return false;
}

async function assertFooterCommit(page, route) {
  const footer = page.locator('footer').filter({ hasText: /Commit/i }).last();
  await waitForVisible(footer, `${route} footer commit`);

  const text = compactText(await footer.textContent());
  const commit = text.match(/\b[0-9a-f]{7,40}\b/i)?.[0]?.toLowerCase();

  if (!commit) {
    throw new Error(`${route} footer did not include a commit SHA: ${JSON.stringify(text)}`);
  }

  if (expectedCommit) {
    const expected = expectedCommit.toLowerCase();
    const commitMatchesExpected = commit.startsWith(expected) || expected.startsWith(commit);

    if (!commitMatchesExpected) {
      throw new Error(`${route} footer commit ${commit} did not match expected ${expectedCommit}`);
    }
  }

  return commit;
}

async function assertSameCommitAcrossRoutes() {
  const commits = new Map(routeResults.map((result) => [result.path, result.commit]));
  const uniqueCommits = new Set(commits.values());

  if (uniqueCommits.size > 1) {
    throw new Error(`Footer commits differed by route: ${JSON.stringify(Object.fromEntries(commits), null, 2)}`);
  }
}

async function assertNoBrowserFailures() {
  await delay(500);

  if (diagnostics.pageErrors.length > 0 || diagnostics.failedRequests.length > 0) {
    throw new Error(`Browser diagnostics recorded page errors or failed same-origin requests:\n${JSON.stringify(diagnostics, null, 2)}`);
  }
}

async function rememberRouteResult(page, path, response, extra = {}) {
  const commit = await assertFooterCommit(page, path);
  routeResults.push({
    path,
    commit,
    response: responseSummary(response),
    ...extra,
  });
}

async function signIn(page) {
  await gotoRoute(page, '/session/new');
  await waitForVisible(page.getByLabel('Email'), 'sign-in email field');

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);

  const [sessionResponse] = await Promise.all([
    page.waitForResponse((candidate) => {
      let url;
      try {
        url = new URL(candidate.url());
      } catch {
        return false;
      }

      return url.origin === new URL(baseURL).origin &&
        url.pathname === '/session' &&
        candidate.request().method() === 'POST';
    }, { timeout: timeoutMs }),
    page.getByRole('button', { name: 'Sign in' }).click({ noWaitAfter: true }),
  ]);

  if (sessionResponse.status() < 300 || sessionResponse.status() >= 400) {
    throw new Error(`Sign-in POST returned ${sessionResponse.status()} instead of a redirect`);
  }

  await page.waitForURL((url) => url.origin === new URL(baseURL).origin && url.pathname === '/dashboard', {
    timeout: timeoutMs,
  });

  await page.waitForLoadState('domcontentloaded', { timeout: timeoutMs });
}

async function smokeDashboard(page) {
  const response = await gotoRoute(page, '/dashboard');
  await waitForVisible(page.locator('main.tanstack-shell').last(), 'dashboard TanStack shell');
  await waitForVisible(page.getByRole('heading', { name: 'Dashboard', exact: true }), 'dashboard heading');
  await expectText(page.locator('body'), /Rails-owned app shell with React where it pays off/, 'dashboard body');
  await rememberRouteResult(page, '/dashboard', response);
}

async function smokeProjects(page) {
  const response = await gotoRoute(page, '/projects');
  await waitForVisible(page.locator('main.tanstack-shell').last(), 'projects TanStack shell');
  await waitForVisible(page.getByRole('heading', { name: 'Projects', exact: true }), 'projects heading');
  await waitForVisible(page.getByRole('heading', { name: 'Project list', exact: true }), 'project list heading');
  await waitForVisible(page.getByLabel('Status'), 'projects status filter');
  await rememberRouteResult(page, '/projects', response);
}

async function smokeRscShowcase(page) {
  const response = await gotoRoute(page, '/rsc-showcase');
  const headingPattern = /Server-streamed RSC composed inside a TanStack route on Rails|Working RSC payloads with the client-reference limit called out/;

  await waitForVisible(
    page.locator('h1').filter({ hasText: headingPattern }),
    'RSC showcase heading',
  );
  await waitForVisible(page.getByRole('navigation', { name: 'RSC showcase navigation' }), 'RSC showcase navigation');

  const fallback = page.getByText('RSC manifests are not available for this build.');
  let outcome = 'rendered';

  if (await fallback.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await waitForVisible(page.getByText('bin/shakapacker'), 'RSC showcase fallback guidance');
    outcome = 'manifest-fallback';
  } else {
    await waitForVisible(page.getByText('RSC streamed by Rails, consumed by a TanStack route'), 'RSC showcase streamed content');

    if (await clickIfVisible(page.getByRole('button', { name: 'Hydrated island' }))) {
      await waitForVisible(page.getByText('2 client clicks inside the fetched RSC payload'), 'RSC hydrated island click result');
    }

    if (await clickIfVisible(page.getByRole('button', { name: 'Pulse client state' }))) {
      await waitForVisible(page.getByText('1 route pulse'), 'RSC route pulse result');
    }
  }

  await rememberRouteResult(page, '/rsc-showcase', response, { rscShowcaseOutcome: outcome });
}

async function smokeHelloServer(page) {
  const response = await gotoRoute(page, '/hello_server');
  await waitForVisible(page.getByRole('heading', { name: /React Server Components Demo/i }), 'hello_server heading');

  const fallbackVisible = await page.locator('[data-rsc-fallback]').isVisible({ timeout: 1_000 }).catch(() => false) ||
    await page.getByText('RSC manifests are not available').isVisible({ timeout: 1_000 }).catch(() => false);
  const outcome = fallbackVisible ? 'manifest-fallback' : 'rendered';

  await rememberRouteResult(page, '/hello_server', response, { helloServerOutcome: outcome });
}

async function main() {
  const browser = await chromium.launch({ headless });

  try {
    const context = await browser.newContext({
      baseURL,
      ignoreHTTPSErrors: false,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(timeoutMs);
    recordBrowserDiagnostics(page);

    await signIn(page);
    await smokeDashboard(page);
    await smokeProjects(page);
    await smokeRscShowcase(page);
    await smokeHelloServer(page);
    await assertSameCommitAcrossRoutes();
    await assertNoBrowserFailures();
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify({
    baseURL,
    expectedCommit,
    routes: routeResults,
    diagnostics: {
      nonFatalConsoleErrors: diagnostics.consoleErrors,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(`live deployed smoke failed: ${error.message}`);
  process.exitCode = 1;
});
