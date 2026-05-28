#!/usr/bin/env node
// REFERENCE PATTERN: dev-mode-smoke - see AGENTS.md section 9

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';

const mode = process.argv[2];
const modeConfig = {
  dev: { basePort: 3320, args: [], label: 'dev', browserSettleMs: 2_000 },
  hmr: { basePort: 3330, args: [], env: { SHAKAPACKER_DEV_SERVER_HMR: 'true' }, label: 'hmr', browserSettleMs: 2_000 },
  static: { basePort: 3300, args: ['static'], label: 'static' },
  prod: { basePort: 3310, args: ['prod'], label: 'prod' },
}[mode];

if (!modeConfig) {
  console.error('Usage: node script/dev-mode-smoke.mjs <dev|hmr|static|prod>');
  process.exit(1);
}

const basePort = Number(process.env.REACT_ON_RAILS_BASE_PORT || modeConfig.basePort);
const baseURL = `http://localhost:${basePort}`;
const rendererPort = basePort + 2;
const maxDiagnosticItems = 20;
const updateSemanticsModes = new Set(['dev', 'hmr']);
const updateSemanticsSourcePath = 'app/javascript/src/styles/tailwind.css';
const recoverableReactPageErrors = [
  'There was an error during concurrent rendering but React was able to recover',
  'There was an error while hydrating but React was able to recover',
];
const ssrDashboardPath = '/dashboard?status=active&sort=name&dir=asc';
const env = {
  ...process.env,
  ...modeConfig.env,
  RAILS_ENV: 'development',
  PORT: String(basePort),
  REACT_ON_RAILS_BASE_PORT: String(basePort),
  REACT_RENDERER_URL: `http://127.0.0.1:${rendererPort}`,
  RENDERER_HOST: '127.0.0.1',
  RENDERER_PORT: String(rendererPort),
  RENDERER_LOG_LEVEL: process.env.RENDERER_LOG_LEVEL || 'info',
  SKIP_DATABASE_CHECK: 'true',
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with ${result.status}`);
  }
}

async function waitForUrl(url, timeoutMs = 180_000) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    assertServerRunning();

    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.ok) return response;
      lastError = new Error(`${url} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await delay(1_000);
  }

  assertServerRunning();
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message || 'no response'}`);
}

async function waitForTcpPort(host, port, timeoutMs = 180_000) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    assertServerRunning();

    const connected = await new Promise((resolve) => {
      const socket = net.connect({ host, port });
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.once('error', (error) => {
        lastError = error;
        resolve(false);
      });
      socket.setTimeout(1_000, () => {
        lastError = new Error(`Timed out connecting to ${host}:${port}`);
        socket.destroy();
        resolve(false);
      });
    });

    if (connected) return;
    await delay(500);
  }

  assertServerRunning();
  throw new Error(`Timed out waiting for ${host}:${port}: ${lastError?.message || 'no response'}`);
}

function manifestAssetValues(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(manifestAssetValues);
  if (value && typeof value === 'object') return Object.values(value).flatMap(manifestAssetValues);

  return [];
}

function isStaticManifest(manifest) {
  const assetValues = manifestAssetValues(manifest);
  const applicationScripts = manifest.entrypoints?.application?.assets?.js || [];

  return applicationScripts.length > 0 && assetValues.every((asset) => (
    asset.startsWith('/packs/') || asset.startsWith('/assets/')
  ));
}

async function waitForStaticManifest(timeoutMs = 180_000) {
  const url = `${baseURL}/packs/manifest.json`;
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    assertServerRunning();

    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.ok) {
        const manifest = await response.json();
        if (isStaticManifest(manifest)) return manifest;
        lastError = new Error(`${url} is still pointing at dev-server assets`);
      } else {
        lastError = new Error(`${url} returned ${response.status}`);
      }
    } catch (error) {
      lastError = error;
    }

    await delay(1_000);
  }

  assertServerRunning();
  throw new Error(`Timed out waiting for static pack manifest: ${lastError?.message || 'no response'}`);
}

function pushDiagnosticItem(items, item) {
  items.push(item);
  if (items.length > maxDiagnosticItems) items.splice(0, items.length - maxDiagnosticItems);
}

function compactText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function responseSummary(response) {
  if (!response) return null;

  const headers = response.headers();
  return {
    method: response.request().method(),
    status: response.status(),
    statusText: response.statusText(),
    url: response.url(),
    location: headers.location || null,
  };
}

function assertHtmlContains(body, expected, description) {
  if (!body.includes(expected)) {
    throw new Error(`Dashboard SSR contract response is missing ${description}: ${expected}`);
  }
}

async function assertDashboardSsrRouterContract(page, response, state, documentRequestsBefore) {
  if (!response) {
    throw new Error('Dashboard SSR contract did not receive a document response');
  }

  const body = await response.text();
  assertHtmlContains(body, 'TANSTACK_SSR_SHELL', 'the Rails SSR shell marker');
  assertHtmlContains(body, 'tanstack-shell', 'the server-rendered dashboard shell');
  assertHtmlContains(body, 'React on Rails + TanStack', 'server-rendered dashboard content');
  assertHtmlContains(body, '"initialPath":"/dashboard"', 'the Rails initialPath handoff');
  assertHtmlContains(body, '"initialSearch":"?status=active', 'the Rails initialSearch handoff');
  assertHtmlContains(body, 'sort=name', 'the Rails initialSearch sort handoff');
  assertHtmlContains(body, 'dir=asc', 'the Rails initialSearch direction handoff');
  assertHtmlContains(body, '__tanstackRouterDehydratedState', 'the dehydrated TanStack Router state');

  await page.locator('main.tanstack-shell').waitFor({ timeout: 30_000 });
  await page.getByRole('heading', { name: 'Dashboard' }).waitFor({ timeout: 30_000 });
  await page.locator('.metric-card').first().waitFor({ timeout: 30_000 });
  await page.waitForURL((url) => (
    url.pathname === '/dashboard' &&
    url.searchParams.get('status') === 'active' &&
    url.searchParams.get('sort') === 'name' &&
    url.searchParams.get('dir') === 'asc'
  ), { timeout: 10_000 });

  state.status.dashboardSsrContract = {
    initialPathSerialized: true,
    initialSearchSerialized: true,
    dehydratedRouterStateSerialized: true,
    documentRequestsDuringHydration: state.status.documentRequests - documentRequestsBefore,
  };

  if (state.status.dashboardSsrContract.documentRequestsDuringHydration !== 1) {
    throw new Error(`Dashboard hydration triggered ${state.status.dashboardSsrContract.documentRequestsDuringHydration} document requests instead of preserving the SSR page`);
  }
}

function isRelevantResponse(response) {
  if (response.request().resourceType() === 'document') return true;

  let url;
  try {
    url = new URL(response.url());
  } catch {
    return false;
  }

  if (url.origin !== baseURL) return false;

  return [
    '/',
    '/session',
    '/session/new',
    '/dashboard',
    '/settings',
    '/projects',
    '/projects/new',
    '/packs/manifest.json',
  ].includes(url.pathname) || url.pathname.startsWith('/api/projects');
}

function isRecoverableReactPageError(message) {
  return recoverableReactPageErrors.some((knownMessage) => message.includes(knownMessage));
}

async function pageFlashMessages(page) {
  try {
    const messages = await page.locator('.auth-alert, .auth-notice, [role="alert"]').evaluateAll((elements) => (
      elements.map((element) => element.textContent || '')
    ));

    return messages.map(compactText).filter(Boolean);
  } catch (error) {
    return [`Unable to read flash messages: ${error.message}`];
  }
}

async function browserDiagnosticsSnapshot(page, diagnostics, state = {}) {
  return {
    mode: modeConfig.label,
    baseURL,
    lastStep: state.lastStep || null,
    currentURL: page.url(),
    flashMessages: await pageFlashMessages(page),
    status: state.status || {},
    recentResponses: diagnostics.recentResponses,
    consoleErrors: diagnostics.consoleErrors,
    pageErrors: diagnostics.pageErrors,
    recoverablePageErrors: diagnostics.recoverablePageErrors,
    failedRequests: diagnostics.failedRequests,
  };
}

async function browserSmokeError(page, diagnostics, state, message) {
  const snapshot = await browserDiagnosticsSnapshot(page, diagnostics, state);
  return new Error(`${message}\n${JSON.stringify(snapshot, null, 2)}`);
}

async function submitDemoSignIn(page, state) {
  state.lastStep = 'submitting sign-in form';

  const [signInResponse] = await Promise.all([
    page.waitForResponse((response) => {
      let url;
      try {
        url = new URL(response.url());
      } catch {
        return false;
      }

      return url.origin === baseURL && url.pathname === '/session' && response.request().method() === 'POST';
    }, { timeout: 30_000 }),
    page.getByRole('button', { name: 'Sign in' }).click({ noWaitAfter: true }),
  ]);

  state.status.signInPost = responseSummary(signInResponse);

  await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => {
    state.status.signInDocumentLoad = 'not observed within 10000ms';
  });

  const leftSignInPage = await page.waitForURL((url) => url.pathname !== '/session/new', { timeout: 5_000 })
    .then(() => true)
    .catch(() => false);

  state.status.signInRedirectSettled = leftSignInPage;
  state.status.postSignInURL = page.url();

  if (signInResponse.status() < 300 || signInResponse.status() >= 400) {
    throw new Error(`Sign-in POST returned ${signInResponse.status()} instead of a redirect`);
  }

  const redirectLocation = state.status.signInPost.location;
  if (redirectLocation) {
    const redirectPath = new URL(redirectLocation, baseURL).pathname;
    state.status.signInRedirectPath = redirectPath;

    if (redirectPath !== '/') {
      throw new Error(`Sign-in POST redirected to ${redirectLocation} instead of /`);
    }
  }
}

async function assertBrowserPicksUpSourceEdit(page, state) {
  if (!updateSemanticsModes.has(mode)) return;

  const sourceBefore = fs.readFileSync(updateSemanticsSourcePath, 'utf8');
  const marker = `dev-mode-smoke-${mode}-${Date.now()}`;
  const sourceAfter = `${sourceBefore}

/* dev-mode-smoke temporary update semantics marker */
main.tanstack-shell::before {
  content: "${marker}";
  position: fixed;
  left: -9999px;
  top: -9999px;
  pointer-events: none;
}
`;

  state.lastStep = 'applying browser source update';
  state.status.sourceUpdatePath = updateSemanticsSourcePath;
  state.status.sourceUpdateMarker = marker;
  fs.writeFileSync(updateSemanticsSourcePath, sourceAfter);

  try {
    state.lastStep = 'waiting for browser source update';
    await page.waitForFunction((expectedMarker) => {
      const shell = document.querySelector('main.tanstack-shell');
      if (!shell) return false;

      return getComputedStyle(shell, '::before').content.includes(expectedMarker);
    }, marker, { timeout: 60_000 });
    state.status.sourceUpdateObserved = true;
  } finally {
    fs.writeFileSync(updateSemanticsSourcePath, sourceBefore);
  }
}

async function smokeBrowser() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });
  const diagnostics = {
    consoleErrors: [],
    pageErrors: [],
    recoverablePageErrors: [],
    failedRequests: [],
    recentResponses: [],
  };
  const state = { lastStep: 'launching browser', status: {} };

  page.on('console', (message) => {
    if (message.type() === 'error') pushDiagnosticItem(diagnostics.consoleErrors, message.text());
  });

  page.on('pageerror', (error) => {
    const target = isRecoverableReactPageError(error.message) ? diagnostics.recoverablePageErrors : diagnostics.pageErrors;
    pushDiagnosticItem(target, error.message);
  });

  page.on('requestfailed', (request) => {
    const failure = request.failure();
    const errorText = failure?.errorText || '';
    if (!errorText.includes('net::ERR_ABORTED')) {
      pushDiagnosticItem(diagnostics.failedRequests, `${request.method()} ${request.url()} ${errorText}`.trim());
    }
  });

  page.on('response', (response) => {
    if (isRelevantResponse(response)) {
      pushDiagnosticItem(diagnostics.recentResponses, responseSummary(response));
    }
  });

  page.on('request', (request) => {
    if (request.resourceType() === 'document') {
      state.status.documentRequests = (state.status.documentRequests || 0) + 1;
    }
  });

  try {
    state.lastStep = 'opening sign-in form';
    state.status.signInForm = responseSummary(await page.goto('/session/new', { waitUntil: 'domcontentloaded' }));
    if (modeConfig.browserSettleMs) await delay(modeConfig.browserSettleMs);
    await page.getByLabel('Email').fill('demo@example.com');
    await page.getByLabel('Password').fill('password');
    await submitDemoSignIn(page, state);

    state.lastStep = 'opening dashboard';
    const documentRequestsBeforeDashboard = state.status.documentRequests || 0;
    const dashboardResponse = await page.goto(ssrDashboardPath, { waitUntil: 'domcontentloaded' });
    state.status.dashboard = responseSummary(dashboardResponse);
    await assertDashboardSsrRouterContract(page, dashboardResponse, state, documentRequestsBeforeDashboard);
    await assertBrowserPicksUpSourceEdit(page, state);
    state.lastStep = 'navigating to settings';
    await page.locator('nav[aria-label="Dashboard navigation"] a[href="/settings"]').click();
    await page.waitForURL('**/settings', { timeout: 20_000 });

    state.lastStep = 'opening new project route';
    state.status.newProject = responseSummary(await page.goto('/projects/new', { waitUntil: 'domcontentloaded' }));
    await page.locator('main.tanstack-shell').getByRole('heading', { name: 'New project' }).waitFor({ timeout: 30_000 });

    if (diagnostics.consoleErrors.length > 0 || diagnostics.pageErrors.length > 0 || diagnostics.failedRequests.length > 0) {
      throw new Error('Browser smoke reported errors');
    }
  } catch (error) {
    throw await browserSmokeError(page, diagnostics, state, `Browser smoke failed: ${error.message}`);
  } finally {
    await browser.close();
  }
}

let serverProcess = null;
let serverExitError = null;
let serverExitRejectors = [];
let shuttingDown = false;

function assertServerRunning() {
  if (serverExitError) throw serverExitError;
}

async function whileServerRuns(task) {
  assertServerRunning();

  let rejectOnExit = null;
  const serverExitPromise = new Promise((_, reject) => {
    rejectOnExit = reject;
    serverExitRejectors.push(reject);
  });

  try {
    return await Promise.race([task(), serverExitPromise]);
  } finally {
    serverExitRejectors = serverExitRejectors.filter((reject) => reject !== rejectOnExit);
    assertServerRunning();
  }
}

try {
  run('bin/rails', ['db:prepare']);
  run('bin/rails', ['db:seed']);

  serverProcess = spawn('bin/dev', [...modeConfig.args, '--no-open-browser', '--route=dashboard'], {
    cwd: process.cwd(),
    env,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', (chunk) => process.stdout.write(chunk));
  serverProcess.stderr.on('data', (chunk) => process.stderr.write(chunk));
  serverProcess.on('exit', (code, signal) => {
    const reason = code !== null ? `code ${code}` : `signal ${signal}`;
    const message = `bin/dev ${modeConfig.label} exited with ${reason}`;

    if (shuttingDown) {
      console.error(message);
    } else {
      serverExitError = new Error(`${message} before smoke completed`);
      for (const reject of serverExitRejectors.splice(0)) reject(serverExitError);
      console.error(serverExitError.message);
    }
  });

  await waitForUrl(`${baseURL}/session/new`);
  await waitForTcpPort('127.0.0.1', rendererPort);
  if (mode === 'static' || mode === 'prod') await waitForStaticManifest();
  assertServerRunning();
  await whileServerRuns(smokeBrowser);
  console.log(`bin/dev ${modeConfig.label} smoke passed at ${baseURL}`);
} finally {
  shuttingDown = true;

  if (fs.existsSync('.overmind.sock')) {
    spawnSync('overmind', ['quit', '--socket', './.overmind.sock'], {
      cwd: process.cwd(),
      env,
      stdio: 'inherit',
    });
  }

  if (serverProcess?.pid) {
    try {
      process.kill(-serverProcess.pid, 'SIGTERM');
    } catch {
      serverProcess.kill('SIGTERM');
    }
  }

  await delay(1_000);

  for (const path of ['.overmind.sock', 'tmp/pids/server.pid']) {
    try {
      fs.rmSync(path, { force: true });
    } catch {
      // Ignore cleanup errors; the smoke failure itself is more important.
    }
  }
}
