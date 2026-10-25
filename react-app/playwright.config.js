import { defineConfig, devices } from '@playwright/test';

const frontendPort = Number(process.env.E2E_PORT || 5173);
const baseURL = process.env.E2E_BASE_URL || `http://localhost:${frontendPort}`;
const apiURL = process.env.E2E_API_URL || 'http://localhost:5000';

const storageState = (role) => `e2e/.auth/${role}.json`;

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm --prefix ../server run start',
      url: `${apiURL}/api/health`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: `npm run dev -- --port ${frontendPort} --strictPort`,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.js/,
    },
    {
      name: 'guest',
      testMatch: /auth\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
    },
    {
      name: 'student',
      testMatch: [/student\.spec\.js/, /theme\.spec\.js/, /responsive\.spec\.js/],
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: storageState('student'),
      },
    },
    {
      name: 'instructor',
      testMatch: /instructor\.spec\.js/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: storageState('instructor'),
      },
    },
    {
      name: 'admin',
      testMatch: /admin\.spec\.js/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: storageState('admin'),
      },
    },
  ],
});
