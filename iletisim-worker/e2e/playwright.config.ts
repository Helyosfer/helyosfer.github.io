// Hizmetler sayfasındaki sohbet penceresi ve yönetim paneli için uçtan uca testler.
// Çalıştırma (iletisim-worker klasöründe):  npm run e2e
// Testler kendi sunucularını açar; 5500, 8787 ve 8790 portları boş olmalı (açık bir `wrangler dev` varsa kapat).
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './testler',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'rapor' }]],
  outputDir: 'sonuclar',
  use: {
    baseURL: 'http://127.0.0.1:5500',
    locale: 'tr-TR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: [
    {
      command: 'node e2e/sunucular/sahte-gemini.mjs',
      cwd: '..',
      url: 'http://127.0.0.1:8790',
      reuseExistingServer: false,
    },
    {
      // Site, depo kökünden olduğu gibi sunulur (GitHub Pages gibi: derleme yok)
      command: 'python3 -m http.server 5500 --bind 127.0.0.1 --directory ..',
      cwd: '..',
      url: 'http://127.0.0.1:5500/hizmetler/',
      reuseExistingServer: false,
      stderr: 'ignore',
    },
    {
      command: 'node e2e/sunucular/worker.mjs',
      cwd: '..',
      url: 'http://127.0.0.1:8787/admin',
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
});
