import { defineConfig, devices } from '@playwright/test';

// Tests navigateur (Playwright) : exigent un serveur de dev déjà lancé (`make start`)
// avec la base seedée (`make fresh`). Lancés par `make e2e`, jamais par `make check`.
export const authFile = 'tests/browser/results/.auth/admin.json';

export default defineConfig({
    testDir: 'tests/browser',
    outputDir: 'tests/browser/results',
    fullyParallel: false,
    workers: 1,
    retries: 0,
    reporter: 'list',
    timeout: 60_000,
    expect: { timeout: 10_000 },
    use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8000',
        locale: 'fr-FR',
        timezoneId: 'Europe/Paris',
        screenshot: 'only-on-failure',
        trace: 'off',
        video: 'off',
    },
    projects: [
        // Une seule connexion par run (le login est limité à 5 tentatives par minute) :
        // la session est enregistrée puis réutilisée par tous les tests.
        { name: 'setup', testMatch: /auth\.setup\.ts/ },
        {
            name: 'chromium',
            use: { browserName: 'chromium', storageState: authFile },
            dependencies: ['setup'],
            testIgnore: /auth\.setup\.ts/,
        },
    ],
});
