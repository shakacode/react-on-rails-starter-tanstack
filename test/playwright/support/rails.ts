import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const railsTestEnv = { ...process.env, RAILS_ENV: 'test' };
const projectRoot = process.cwd();
const packsManifestPath = path.join(projectRoot, 'public/packs-test/manifest.json');
const assetsStampPath = path.join(projectRoot, 'tmp/playwright-assets.stamp');
const assetsLockPath = path.join(projectRoot, 'tmp/playwright-assets.lock');
const assetsLockTimeoutMs = 300_000;
const assetInputPaths = [
  'app/javascript',
  'app/views',
  'config/rspack',
  'config/shakapacker.yml',
  'package.json',
  'pnpm-lock.yaml',
  'postcss.config.mjs',
];

function sleepSync(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function latestMtimeMs(inputPath: string): number {
  if (!existsSync(inputPath)) return 0;

  const inputStat = statSync(inputPath);

  if (!inputStat.isDirectory()) return inputStat.mtimeMs;

  return readdirSync(inputPath).reduce((latest, entry) => {
    return Math.max(latest, latestMtimeMs(path.join(inputPath, entry)));
  }, inputStat.mtimeMs);
}

function assetsArePrepared() {
  if (!existsSync(packsManifestPath) || !existsSync(assetsStampPath)) return false;

  const stampMtime = statSync(assetsStampPath).mtimeMs;
  const latestInputMtime = assetInputPaths.reduce((latest, inputPath) => {
    return Math.max(latest, latestMtimeMs(path.join(projectRoot, inputPath)));
  }, 0);

  return stampMtime >= latestInputMtime;
}

function acquireAssetsLock() {
  mkdirSync(path.dirname(assetsLockPath), { recursive: true });

  const startedAt = Date.now();

  while (true) {
    try {
      mkdirSync(assetsLockPath);
      return;
    } catch (error) {
      if ((error as { code?: string }).code !== 'EEXIST') throw error;

      const elapsedMs = Date.now() - startedAt;
      const lockAgeMs = existsSync(assetsLockPath) ? Date.now() - statSync(assetsLockPath).mtimeMs : 0;

      if (lockAgeMs > assetsLockTimeoutMs) {
        rmSync(assetsLockPath, { force: true, recursive: true });
        continue;
      }

      if (elapsedMs > assetsLockTimeoutMs) {
        throw new Error(`Timed out waiting for Playwright assets lock at ${assetsLockPath}`);
      }

      sleepSync(100);
    }
  }
}

function releaseAssetsLock() {
  rmSync(assetsLockPath, { force: true, recursive: true });
}

export function preparePlaywrightAssets() {
  if (assetsArePrepared()) return;

  acquireAssetsLock();

  try {
    if (assetsArePrepared()) return;

    // Playwright runs spec files in parallel workers; Shakapacker cannot safely
    // clean and rebuild the same packs-test directory concurrently.
    execFileSync('bin/rails', ['react_on_rails:generate_packs'], {
      env: railsTestEnv,
      stdio: 'inherit',
    });
    execFileSync('bin/shakapacker', {
      env: railsTestEnv,
      stdio: 'inherit',
    });
    writeFileSync(assetsStampPath, `${Date.now()}\n`);
  } finally {
    releaseAssetsLock();
  }
}

export function runRailsRunner(script: string) {
  execFileSync('bin/rails', ['runner', script], {
    env: railsTestEnv,
    stdio: 'inherit',
  });
}
