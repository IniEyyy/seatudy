import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as setup, expect } from '@playwright/test';

const authDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '.auth');
fs.mkdirSync(authDir, { recursive: true });

const ACCOUNTS = {
  student: { email: 'student@seatudy.local', password: 'Student@123' },
  instructor: { email: 'instructor@seatudy.local', password: 'Instructor@123' },
  admin: { email: 'admin@seatudy.local', password: 'Admin@123' },
};

for (const [role, credentials] of Object.entries(ACCOUNTS)) {
  setup(`sign in as ${role}`, async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(credentials.email);
    await page.getByLabel('Password', { exact: true }).fill(credentials.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await page.waitForURL('**/dashboard');
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();

    await page.context().storageState({ path: path.join(authDir, `${role}.json`) });
  });
}
