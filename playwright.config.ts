import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PORT ?? 3100);
const rendererPort = Number(process.env.RENDERER_PORT ?? 3800);
const rendererUrl = `http://127.0.0.1:${rendererPort}`;

export default defineConfig({
  testDir: './test/playwright',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'node client/node-renderer.js',
      env: {
        RAILS_ENV: 'test',
        RENDERER_HOST: '127.0.0.1',
        RENDERER_LOG_LEVEL: 'warn',
        RENDERER_PORT: String(rendererPort),
        RENDERER_WORKERS_COUNT: '0',
      },
      name: 'renderer',
      port: rendererPort,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: `bin/rails server -p ${port}`,
      env: {
        RAILS_ENV: 'test',
        PORT: String(port),
        REACT_RENDERER_URL: rendererUrl,
      },
      name: 'rails',
      url: `http://127.0.0.1:${port}/up`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
