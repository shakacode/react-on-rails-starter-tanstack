#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

const args = process.argv.slice(2);
const helpRequested = args.includes('--help') || args.includes('-h');
const skipPrecompile = args.includes('--skip-precompile');
const unknownArgs = args.filter((arg) => !['--help', '-h', '--skip-precompile'].includes(arg));

function usage() {
  console.log(`Usage:
  node script/production-boot-smoke.mjs [--skip-precompile]

Runs a production boot smoke against compiled Rspack assets and the React on Rails Pro Node renderer.

Environment:
  PRODUCTION_SMOKE_PORT            Rails port. Defaults to the first open port from 3420.
  PRODUCTION_SMOKE_RENDERER_PORT   Node renderer port. Defaults to the first open port after Rails.
  PRODUCTION_SMOKE_HOST            Bind/connect host. Defaults to 127.0.0.1.
  DATABASE_URL, CACHE_DATABASE_URL, QUEUE_DATABASE_URL, CABLE_DATABASE_URL
                                   Optional production database URLs for CI/local smoke databases.
`);
}

if (helpRequested) {
  usage();
  process.exit(0);
}

if (unknownArgs.length > 0) {
  console.error(`Unknown argument(s): ${unknownArgs.join(', ')}`);
  usage();
  process.exit(1);
}

const host = process.env.PRODUCTION_SMOKE_HOST || '127.0.0.1';
const defaultRailsPort = 3420;
const pidFile = 'tmp/pids/production-boot-smoke.pid';
const requestHeaders = {
  Accept: 'text/html,application/xhtml+xml',
  'X-Forwarded-Proto': 'https',
};
const demoUserEmail = 'demo@example.com';
const demoUserPassword = 'password';

function parsePort(value, name) {
  if (value == null || value === '') return null;

  const port = Number(value);
  if (Number.isInteger(port) && port > 0 && port < 65_536) return port;

  throw new Error(`${name} must be a TCP port number between 1 and 65535`);
}

async function canBind(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen({ host, port }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + 100; port += 1) {
    if (await canBind(port)) return port;
  }

  throw new Error(`Could not find an available port from ${startPort} to ${startPort + 99}`);
}

async function choosePort(requestedPort, fallbackStart, name) {
  if (requestedPort) {
    if (!(await canBind(requestedPort))) {
      throw new Error(`${name} port ${requestedPort} is already in use`);
    }

    return requestedPort;
  }

  return findAvailablePort(fallbackStart);
}

function run(command, commandArgs, env) {
  console.log(`\n==> ${command} ${commandArgs.join(' ')}`);
  const result = spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${commandArgs.join(' ')} exited with ${result.status}`);
  }
}

function streamWithPrefix(stream, prefix) {
  let pending = '';

  stream.on('data', (chunk) => {
    pending += chunk.toString();
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() || '';

    for (const line of lines) {
      if (line.length > 0) console.log(`[${prefix}] ${line}`);
    }
  });

  stream.on('end', () => {
    if (pending.length > 0) console.log(`[${prefix}] ${pending}`);
  });
}

let shuttingDown = false;
let serviceExitError = null;
let serviceExitRejectors = [];
const services = [];

function spawnService(name, command, commandArgs, env) {
  console.log(`\n==> starting ${name}: ${command} ${commandArgs.join(' ')}`);
  const child = spawn(command, commandArgs, {
    cwd: process.cwd(),
    detached: true,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  streamWithPrefix(child.stdout, name);
  streamWithPrefix(child.stderr, name);

  child.on('error', (error) => {
    serviceExitError = new Error(`${name} failed to start: ${error.message}`);
    for (const reject of serviceExitRejectors.splice(0)) reject(serviceExitError);
  });

  child.on('exit', (code, signal) => {
    const reason = code === null ? `signal ${signal}` : `code ${code}`;
    const message = `${name} exited with ${reason}`;

    if (shuttingDown) {
      console.log(message);
    } else {
      serviceExitError = new Error(`${message} before the smoke completed`);
      for (const reject of serviceExitRejectors.splice(0)) reject(serviceExitError);
      console.error(serviceExitError.message);
    }
  });

  services.push({ child, name });
  return child;
}

function assertServicesRunning() {
  if (serviceExitError) throw serviceExitError;
}

async function whileServicesRun(task) {
  assertServicesRunning();

  let rejectOnExit = null;
  const serviceExitPromise = new Promise((_, reject) => {
    rejectOnExit = reject;
    serviceExitRejectors.push(reject);
  });

  try {
    return await Promise.race([task(), serviceExitPromise]);
  } finally {
    serviceExitRejectors = serviceExitRejectors.filter((reject) => reject !== rejectOnExit);
    assertServicesRunning();
  }
}

async function waitForTcpPort(port, label, timeoutMs = 60_000) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    assertServicesRunning();

    const connected = await new Promise((resolve) => {
      const socket = net.connect({ host, port });
      socket.once('connect', () => {
        socket.end();
        resolve(true);
      });
      socket.once('error', (error) => {
        lastError = error;
        resolve(false);
      });
    });

    if (connected) return;
    await delay(500);
  }

  throw new Error(`Timed out waiting for ${label} on ${host}:${port}: ${lastError?.message || 'no connection'}`);
}

async function fetchSmokePath(baseURL, path, options = {}) {
  const { cookieHeader, headers: optionHeaders, ...fetchOptions } = options;
  const headers = new Headers({ ...requestHeaders, ...optionHeaders });
  if (cookieHeader) headers.set('Cookie', cookieHeader);

  return fetch(`${baseURL}${path}`, {
    ...fetchOptions,
    headers,
    redirect: 'manual',
  });
}

async function waitForRailsHealth(baseURL, timeoutMs = 120_000) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    assertServicesRunning();

    try {
      const response = await fetchSmokePath(baseURL, '/up');
      if (response.status === 200) return;
      lastError = new Error(`/up returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await delay(1_000);
  }

  throw new Error(`Timed out waiting for production Rails /up: ${lastError?.message || 'no response'}`);
}

function setCookieHeaders(headers) {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();

  const combined = headers.get('set-cookie');
  if (!combined) return [];

  return combined.split(/,(?=\s*[^;,=]+=)/);
}

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  store(response) {
    for (const header of setCookieHeaders(response.headers)) {
      const pair = header.split(';', 1)[0];
      const separator = pair.indexOf('=');
      if (separator === -1) continue;

      this.cookies.set(pair.slice(0, separator).trim(), pair.slice(separator + 1).trim());
    }
  }

  header() {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }
}

function decodeHtmlAttribute(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function extractCsrfToken(html) {
  const metaToken = html.match(/<meta\s+name=["']csrf-token["']\s+content=["']([^"']+)["']/i);
  if (metaToken) return decodeHtmlAttribute(metaToken[1]);

  const inputToken = html.match(/<input[^>]+name=["']authenticity_token["'][^>]+value=["']([^"']+)["']/i);
  if (inputToken) return decodeHtmlAttribute(inputToken[1]);

  throw new Error('Could not find Rails CSRF token on the sign-in page');
}

function assertBodyIncludes(body, text, label) {
  if (!body.includes(text)) {
    throw new Error(`${label} did not include ${JSON.stringify(text)}`);
  }
}

async function smokeAuthenticatedDashboard(baseURL) {
  const jar = new CookieJar();

  const signInFormResponse = await fetchSmokePath(baseURL, '/session/new');
  jar.store(signInFormResponse);

  if (signInFormResponse.status !== 200) {
    throw new Error(`/session/new returned ${signInFormResponse.status}`);
  }

  const signInFormHtml = await signInFormResponse.text();
  const csrfToken = extractCsrfToken(signInFormHtml);
  const form = new URLSearchParams({
    authenticity_token: csrfToken,
    email_address: demoUserEmail,
    password: demoUserPassword,
  });

  const signInResponse = await fetchSmokePath(baseURL, '/session', {
    body: form,
    cookieHeader: jar.header(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    method: 'POST',
  });
  jar.store(signInResponse);

  if (![302, 303].includes(signInResponse.status)) {
    const body = await signInResponse.text();
    throw new Error(`/session returned ${signInResponse.status} instead of a redirect: ${body.slice(0, 500)}`);
  }

  const projectsPath = '/projects?status=active&sort=name&dir=asc';
  const projectsResponse = await fetchSmokePath(baseURL, projectsPath, {
    cookieHeader: jar.header(),
  });

  if (projectsResponse.status !== 200) {
    const body = await projectsResponse.text();
    throw new Error(`${projectsPath} returned ${projectsResponse.status}: ${body.slice(0, 500)}`);
  }

  const projectsBody = await projectsResponse.text();
  assertBodyIncludes(projectsBody, 'TANSTACK_SSR_SHELL', projectsPath);
  assertBodyIncludes(projectsBody, 'class="tanstack-shell', projectsPath);
  assertBodyIncludes(projectsBody, 'Demo User', projectsPath);
  assertBodyIncludes(projectsBody, 'Project list', projectsPath);
}

function stopServices() {
  shuttingDown = true;

  for (const { child, name } of services.reverse()) {
    if (!child.pid || child.exitCode !== null) continue;

    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      try {
        child.kill('SIGTERM');
      } catch (error) {
        console.error(`Failed to stop ${name}: ${error.message}`);
      }
    }
  }
}

const seedDemoUserRuby = `
demo_user = User.find_or_initialize_by(email_address: "demo@example.com")
demo_user.assign_attributes(
  name: "Demo User",
  password: "password",
  password_confirmation: "password",
  email_verified_at: Time.current,
  email_verification_token_digest: nil,
  verification_sent_at: 2.days.ago
)
demo_user.save!

statuses = Project.statuses.keys
3.times do |index|
  project = demo_user.projects.find_or_initialize_by(name: "Production Smoke Project #{index + 1}")
  project.assign_attributes(
    description: "Production boot smoke coverage",
    status: statuses[index % statuses.length],
    created_at: (index + 7).days.ago,
    last_activity_at: (index + 1).hours.ago
  )
  project.save!
end

puts "Prepared production smoke user demo@example.com / password"
`;

const requestedRailsPort = parsePort(process.env.PRODUCTION_SMOKE_PORT || process.env.PORT, 'PRODUCTION_SMOKE_PORT');
const railsPort = await choosePort(requestedRailsPort, defaultRailsPort, 'Rails');
const requestedRendererPort = parsePort(
  process.env.PRODUCTION_SMOKE_RENDERER_PORT || process.env.RENDERER_PORT,
  'PRODUCTION_SMOKE_RENDERER_PORT',
);
const rendererPort = await choosePort(requestedRendererPort, railsPort + 1, 'Node renderer');

if (railsPort === rendererPort) {
  throw new Error(`Rails and Node renderer ports must differ; both resolved to ${railsPort}`);
}

const baseURL = `http://${host}:${railsPort}`;
const env = {
  ...process.env,
  PORT: String(railsPort),
  RAILS_ENV: 'production',
  RAILS_LOG_LEVEL: process.env.RAILS_LOG_LEVEL || 'warn',
  RAILS_SERVE_STATIC_FILES: process.env.RAILS_SERVE_STATIC_FILES || 'true',
  REACT_ON_RAILS_STARTER_TANSTACK_DATABASE_PASSWORD:
    process.env.REACT_ON_RAILS_STARTER_TANSTACK_DATABASE_PASSWORD || 'dummy',
  REACT_RENDERER_URL: `http://${host}:${rendererPort}`,
  RENDERER_HOST: process.env.RENDERER_HOST || host,
  RENDERER_LOG_LEVEL: process.env.RENDERER_LOG_LEVEL || 'warn',
  RENDERER_PORT: String(rendererPort),
  RENDERER_WORKERS_COUNT: process.env.RENDERER_WORKERS_COUNT || '0',
  SECRET_KEY_BASE_DUMMY: process.env.SECRET_KEY_BASE_DUMMY || '1',
};

try {
  if (!skipPrecompile) run('bin/rails', ['assets:precompile'], env);
  run('bin/rails', ['db:prepare'], env);
  run('bin/rails', ['runner', seedDemoUserRuby], env);

  spawnService('renderer', 'node', ['client/node-renderer.js'], env);
  await waitForTcpPort(rendererPort, 'React on Rails Pro Node renderer');

  spawnService('rails', 'bin/rails', ['server', '-b', host, '-p', String(railsPort), '-e', 'production', '--pid', pidFile], env);
  await waitForRailsHealth(baseURL);

  await whileServicesRun(async () => {
    await smokeAuthenticatedDashboard(baseURL);
  });

  console.log(`Production boot smoke passed at ${baseURL} with renderer ${env.REACT_RENDERER_URL}`);
} finally {
  stopServices();
  await delay(1_000);

  try {
    fs.rmSync(pidFile, { force: true });
  } catch {
    // Ignore cleanup errors; the smoke result is more important.
  }
}
