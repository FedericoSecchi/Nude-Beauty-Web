import { defineConfig, devices } from '@playwright/test';

const PREVIEW_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:4000';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: PREVIEW_URL,
    // x-e2e-token NO va global: se mandaría también a otros orígenes. Lo agrega compra.spec.ts
    // solo a las functions del preview.
  },
  // Usamos Chromium para mobile (Pixel 5) y desktop: evita instalar webkit extra y mantiene
  // una base común. El objetivo es verificar comportamiento responsive, no renderers.
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
});
