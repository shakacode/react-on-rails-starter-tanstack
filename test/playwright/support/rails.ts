import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const railsTestEnv = { ...process.env, RAILS_ENV: 'test' };
const manifestPath = path.resolve('public/packs-test/manifest.json');
const lockPath = path.resolve('tmp/playwright-assets.lock');
const lockTimeoutMs = 120_000;

function sleepSync(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function assetsAreReady() {
  return fs.existsSync(manifestPath);
}

function acquireAssetLock() {
  const startedAt = Date.now();

  while (true) {
    try {
      fs.mkdirSync(lockPath, { recursive: false });
      return;
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
      if (code !== 'EEXIST') throw error;

      if (Date.now() - startedAt > lockTimeoutMs) {
        fs.rmSync(lockPath, { recursive: true, force: true });
        continue;
      }

      sleepSync(200);
    }
  }
}

function releaseAssetLock() {
  fs.rmSync(lockPath, { recursive: true, force: true });
}

export function preparePlaywrightAssets() {
  if (assetsAreReady()) return;

  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  acquireAssetLock();

  try {
    if (assetsAreReady()) return;

    execFileSync('bin/rails', ['react_on_rails:generate_packs'], {
      env: railsTestEnv,
      stdio: 'inherit',
    });
    execFileSync('bin/shakapacker', {
      env: railsTestEnv,
      stdio: 'inherit',
    });
  } finally {
    releaseAssetLock();
  }
}

export function runRailsRunner(script: string) {
  execFileSync('bin/rails', ['runner', script], {
    env: railsTestEnv,
    stdio: 'inherit',
  });
}
