import { expect, test, type ConsoleMessage, type Page } from '@playwright/test';
import { authFile } from '../../playwright.config';
import { expectNoOverflow } from './support/overflow';
import { keyPages, resolvePath } from './support/pages';

const widths = [390, 768, 1280] as const;

/** Erreurs console à ignorer : ressources tierces (Google Maps…) et messages Vite/HMR. */
const ignoredConsole = [
    /googleapis|gstatic|google\.com|maps/i,
    /Failed to load resource/i,
    /\[vite\]|hmr|websocket|ws:\/\//i,
    /reverb|pusher/i,
    // dnd-kit : l'id `DndDescribedBy-n` de son compteur diffère entre SSR et client
    // (avertissement d'hydratation connu, sans rapport avec le responsive).
    /DndDescribedBy/,
];

function isRelevantError(message: ConsoleMessage): boolean {
    if (message.type() !== 'error') {
        return false;
    }
    const text = `${message.text()} ${message.location().url}`;
    return !ignoredConsole.some((pattern) => pattern.test(text));
}

/** Visite une page à une largeur donnée et vérifie réponse, cadre et console. */
async function audit(
    page: Page,
    path: string,
    width: number,
    label: string,
): Promise<void> {
    const errors: string[] = [];
    const onConsole = (message: ConsoleMessage) => {
        if (isRelevantError(message)) {
            errors.push(message.text());
        }
    };
    page.on('console', onConsole);

    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto(path, { waitUntil: 'networkidle' });
    expect(response, `Pas de réponse pour ${path}`).not.toBeNull();
    expect(
        response!.status(),
        `${path} répond ${response!.status()}`,
    ).toBeLessThan(400);

    await expectNoOverflow(page, `${label} à ${width}px`);

    page.off('console', onConsole);
    expect(
        errors,
        `Erreurs console sur ${path}\n  ${errors.join('\n  ')}`,
    ).toEqual([]);
}

test.describe('Responsive : pages clés', () => {
    let page: Page;
    const paths = new Map<string, string | null>();

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage({
            storageState: authFile,
            viewport: { width: 1280, height: 900 },
        });
        page.on('dialog', (dialog) => void dialog.dismiss());
        for (const keyPage of keyPages) {
            paths.set(keyPage.name, await resolvePath(page, keyPage));
        }
    });

    test.afterAll(async () => {
        await page.close();
    });

    for (const width of widths) {
        for (const keyPage of keyPages) {
            test(`${width}px · ${keyPage.name}`, async () => {
                const path = paths.get(keyPage.name);
                test.skip(
                    path === null,
                    `Aucune fiche trouvée pour « ${keyPage.name} »`,
                );
                await audit(page, path!, width, keyPage.name);
            });
        }
    }
});

test.describe('Responsive : connexion (hors session)', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    for (const width of widths) {
        test(`${width}px · Connexion`, async ({ page }) => {
            await audit(page, '/login', width, 'Connexion');
            await expect(page).toHaveURL(/\/login$/);
        });
    }
});
