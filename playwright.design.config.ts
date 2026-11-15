import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/design-lab',
  testMatch: '*.spec.ts',
  workers: 1,
  timeout: 45_000,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5174', browserName: 'chromium', reducedMotion: 'reduce', screenshot: 'only-on-failure' },
  webServer: { command: 'npm run dev:design', url: 'http://127.0.0.1:5174', reuseExistingServer: false },
  projects: [
    { name: 'expanded', use: { viewport: { width: 1488, height: 784 } } },
    { name: 'compact', use: { viewport: { width: 396, height: 784 }, isMobile: true, hasTouch: true } },
    { name: 'mobile-safety', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
});
