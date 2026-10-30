// Erişilebilirlik ve duyarlılık testleri. Siteyi deponun kökünden basit bir sunucuyla açar; canlıya dokunmaz.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.mjs',
  timeout: 90_000,
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { outputFolder: 'rapor', open: 'never' }]] : 'list',
  outputDir: 'sonuclar',
  use: { baseURL: 'http://127.0.0.1:5510', browserName: 'chromium' },
  webServer: {
    command: 'python3 -m http.server 5510 --bind 127.0.0.1 --directory ../..',
    url: 'http://127.0.0.1:5510/',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'ignore',
  },
});
