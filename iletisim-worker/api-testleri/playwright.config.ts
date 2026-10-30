// İletişim Worker'ı arka uç API ve sözleşme testleri yapılandırması.
// Çalıştırma (iletisim-worker klasöründe):  npm run test:api
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['api.spec.ts'],
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'rapor' }]],
  outputDir: 'sonuclar',
  use: {
    baseURL: 'http://127.0.0.1:8787',
  },
  webServer: [
    {
      command: 'node e2e/sunucular/sahte-gemini.mjs',
      cwd: '..',
      url: 'http://127.0.0.1:8790',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'node e2e/sunucular/worker.mjs',
      cwd: '..',
      url: 'http://127.0.0.1:8787/admin',
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
