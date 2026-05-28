import { execFileSync } from 'node:child_process';

const railsTestEnv = { ...process.env, RAILS_ENV: 'test' };

export function preparePlaywrightAssets() {
  execFileSync('bin/rails', ['react_on_rails:generate_packs'], {
    env: railsTestEnv,
    stdio: 'inherit',
  });
  execFileSync('bin/shakapacker', {
    env: railsTestEnv,
    stdio: 'inherit',
  });
}

export function runRailsRunner(script: string) {
  execFileSync('bin/rails', ['runner', script], {
    env: railsTestEnv,
    stdio: 'inherit',
  });
}
