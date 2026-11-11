import { defineConfig, devices } from '@playwright/test';

// Tests de navegador contra el build de producción servido en local (docs/testing.md). Nunca contra
// un entorno remoto.
const PUERTO = 4322;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: `http://localhost:${PUERTO}`, trace: 'retain-on-failure' },
  webServer: {
    command: `pnpm build && pnpm preview --port ${PUERTO} --ignore-lock`,
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: 'movil-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'escritorio', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'movil-webkit', use: { ...devices['iPhone 14'] } },
  ],
});
