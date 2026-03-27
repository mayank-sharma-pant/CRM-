const { defineConfig, devices } = require('@playwright/test');

const BACKEND_URL = 'http://127.0.0.1:8001';
const FRONTEND_URL = 'http://127.0.0.1:3001';

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 120000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: FRONTEND_URL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'python scripts/e2e_seed.py && python -m uvicorn app.main:app --host 127.0.0.1 --port 8001',
      cwd: '../backend',
      env: {
        DATABASE_URL: 'sqlite:///./e2e.db',
        ENVIRONMENT: 'development',
        SECRET_KEY: 'e2e-secret-key-please-change-in-real-env',
        CORS_ORIGINS: 'http://127.0.0.1:3001,http://localhost:3001',
      },
      url: `${BACKEND_URL}/health`,
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command: 'npm run dev -- --hostname 127.0.0.1 --port 3001',
      cwd: '.',
      env: {
        NEXT_PUBLIC_API_URL: BACKEND_URL,
      },
      url: `${FRONTEND_URL}/login`,
      reuseExistingServer: false,
      timeout: 180000,
    },
  ],
});
