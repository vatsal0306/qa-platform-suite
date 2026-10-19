import { defineConfig, devices } from '@playwright/test';

// Device emulation: iOS Safari engine (WebKit) and Android Chrome engine (Chromium).
export default defineConfig({
  testDir: './specs',
  reporter: [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'reports/junit.xml' }]],
  use: { baseURL: process.env.BASE_URL || 'http://localhost:5173', trace: 'retain-on-failure' },
  projects: [
    { name: 'iPhone 13 (iOS Safari)', use: { ...devices['iPhone 13'] } },
    { name: 'iPad Mini (iPadOS Safari)', use: { ...devices['iPad Mini'] } },
    { name: 'Pixel 7 (Android Chrome)', use: { ...devices['Pixel 7'] } },
    { name: 'Galaxy S9+ (Android Chrome)', use: { ...devices['Galaxy S9+'] } },
  ],
});
