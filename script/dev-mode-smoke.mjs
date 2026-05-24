#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';

const mode = process.argv[2];
const modeConfig = {
  static: { basePort: 3300, command: 'static' },
  prod: { basePort: 3310, command: 'prod' },
}[mode];

if (!modeConfig) {
  console.error('Usage: node script/dev-mode-smoke.mjs <static|prod>');
  process.exit(1);
}

const basePort = Number(process.env.REACT_ON_RAILS_BASE_PORT || modeConfig.basePort);
const baseURL = `http://127.0.0.1:${basePort}`;
const env = {
  ...process.env,
  RAILS_ENV: 'development',
  REACT_ON_RAILS_BASE_PORT: String(basePort),
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
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.status >= 200 && response.status < 500) return response;
      lastError = new Error(`${url} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await delay(1_000);
  }

  throw new Error(`Timed out waiting for ${url}: ${lastError?.message || 'no response'}`);
}

async function smokeBrowser() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });
  const consoleErrors = [];
  const failedRequests = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  page.on('requestfailed', (request) => {
    const failure = request.failure();
    if (!failure?.errorText.includes('net::ERR_ABORTED')) {
      failedRequests.push(`${request.url()} ${failure?.errorText || ''}`.trim());
    }
  });

  try {
    await page.goto('/session/new', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Email').fill('demo@example.com');
    await page.getByLabel('Password').fill('password');
    await Promise.all([
      page.waitForURL('**/', { timeout: 20_000 }),
      page.getByRole('button', { name: 'Sign in' }).click(),
    ]);

    await page.goto('/dashboard?status=active&sort=name&dir=asc', { waitUntil: 'domcontentloaded' });
    await page.locator('main.tanstack-shell').waitFor({ timeout: 30_000 });
    await page.getByRole('heading', { name: 'Dashboard' }).waitFor({ timeout: 30_000 });
    await page.locator('.metric-card').first().waitFor({ timeout: 30_000 });
    await page.locator('nav[aria-label="Dashboard navigation"] a[href="/settings"]').click();
    await page.waitForURL('**/settings', { timeout: 20_000 });

    await page.goto('/projects/new', { waitUntil: 'domcontentloaded' });
    await page.locator('main.tanstack-shell').getByRole('heading', { name: 'New project' }).waitFor({ timeout: 30_000 });

    if (consoleErrors.length > 0 || failedRequests.length > 0) {
      throw new Error(`Browser smoke reported errors: ${JSON.stringify({ consoleErrors, failedRequests }, null, 2)}`);
    }
  } finally {
    await browser.close();
  }
}

let serverProcess = null;

try {
  run('bin/rails', ['db:prepare']);
  run('bin/rails', ['db:seed']);

  serverProcess = spawn('bin/dev', [modeConfig.command, '--no-open-browser', '--route=dashboard'], {
    cwd: process.cwd(),
    env,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', (chunk) => process.stdout.write(chunk));
  serverProcess.stderr.on('data', (chunk) => process.stderr.write(chunk));
  serverProcess.on('exit', (code, signal) => {
    if (code !== null && code !== 0) {
      console.error(`bin/dev ${modeConfig.command} exited early with ${code}`);
    } else if (signal) {
      console.error(`bin/dev ${modeConfig.command} exited from ${signal}`);
    }
  });

  await waitForUrl(`${baseURL}/session/new`);
  if (mode === 'static') await waitForUrl(`${baseURL}/packs/manifest.json`);
  await smokeBrowser();
  console.log(`bin/dev ${modeConfig.command} smoke passed at ${baseURL}`);
} finally {
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
