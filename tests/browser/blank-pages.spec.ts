import { expect, test, type ConsoleMessage, type Page } from '@playwright/test';
import { authFile } from '../../playwright.config';
import { keyPages, resolvePath } from './support/pages';

/**
 * Aucune page ne doit rester blanche : une erreur de rendu React démonte
 * l'arbre et laisse `#app` vide, sans que le serveur ait répondu autre chose
 * que 200. On vérifie donc que chaque page clé affiche du texte, qu'aucune
 * exception JavaScript n'a été levée et qu'aucune erreur console applicative
 * n'est apparue.
 */
const ignoredConsole = [
    /googleapis|gstatic|google\.com|maps/i,
    /Failed to load resource/i,
    /\[vite\]|hmr|websocket|ws:\/\//i,
    /reverb|pusher/i,
    /DndDescribedBy/,
];

function isRelevantError(message: ConsoleMessage): boolean {
    if (message.type() !== 'error') {
        return false;
    }
    const text = `${message.text()} ${message.location().url}`;
    return !ignoredConsole.some((pattern) => pattern.test(text));
}

async function auditRender(page: Page, path: string): Promise<void> {
    const errors: string[] = [];
    const onConsole = (message: ConsoleMessage) => {
        if (isRelevantError(message)) {
            errors.push(message.text());
        }
    };
    const onPageError = (error: Error) => {
        errors.push(`pageerror: ${error.message}`);
    };
    page.on('console', onConsole);
    page.on('pageerror', onPageError);

    const response = await page.goto(path, { waitUntil: 'load' });
    expect(response, `Pas de réponse pour ${path}`).not.toBeNull();
    expect(
        response!.status(),
        `${path} répond ${response!.status()}`,
    ).toBeLessThan(400);

    // Le contenu applicatif doit être là : une page blanche a un `#app` vide.
    await expect
        .poll(
            async () =>
                (
                    await page
                        .locator('#app')
                        .innerText()
                        .catch(() => '')
                ).trim().length,
            { message: `${path} s'affiche en blanc`, timeout: 10_000 },
        )
        .toBeGreaterThan(20);

    // Laisser passer les effets (requêtes JSON, cartes) qui peuvent planter après le rendu.
    await page.waitForTimeout(1_000);

    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    expect(
        errors,
        `Erreurs JavaScript sur ${path}\n  ${errors.join('\n  ')}`,
    ).toEqual([]);
}

test.describe('Rendu : aucune page blanche', () => {
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

    for (const keyPage of keyPages) {
        test(keyPage.name, async () => {
            const path = paths.get(keyPage.name);
            test.skip(
                path === null,
                `Aucune fiche trouvée pour « ${keyPage.name} »`,
            );
            await auditRender(page, path!);
        });
    }
});
