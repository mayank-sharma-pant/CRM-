const { defineConfig, devices } = require('@playwright/test');

const BACKEND_URL = 'http://127.0.0.1:8001';
const FRONTEND_URL = 'http://127.0.0.1:3001';
const LOCAL_LIVE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
// Windows: `py` avoids the Microsoft Store python stub; Linux/macOS use python3.
const PY = process.platform === 'win32' ? 'py' : 'python3';

const useExternalStack = process.env.PW_USE_EXTERNAL === '1';

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
      testIgnore: /local-smoke\.spec\.js$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'local-chromium',
      testMatch: /local-smoke\.spec\.js$/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: LOCAL_LIVE_URL,
        trace: 'retain-on-failure',
        video: 'retain-on-failure',
        screenshot: 'only-on-failure',
      },
    },
  ],
  webServer: useExternalStack ? undefined : [
    {
      // Use 'py' on Windows to avoid the Microsoft Store 'python' stub.
      command: `${PY} scripts/e2e_seed.py && ${PY} -m uvicorn app.main:app --host 127.0.0.1 --port 8001`,
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
      // Use production server for E2E to avoid dev-only Next overlays/devtools crashes.
      command: 'npm run build && npm run start -- --hostname 127.0.0.1 --port 3001',
      cwd: '.',
      env: {
        // Next rewrites read BACKEND_URL (see next.config.mjs)
        BACKEND_URL: BACKEND_URL,
        NEXT_PUBLIC_API_URL: BACKEND_URL,
      },
      url: `${FRONTEND_URL}/login`,
      reuseExistingServer: false,
      timeout: 180000,
    },
  ],
});
