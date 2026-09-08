import { expect, test } from '@playwright/test';
import { login } from './support/auth';

test.describe('Parcours de base', () => {
    test('la connexion mène au tableau de bord et la sidebar l’affiche', async ({
        browser,
    }) => {
        const page = await browser.newPage({
            storageState: { cookies: [], origins: [] },
        });
        await login(page);
        await expect(page).toHaveURL(/\/dashboard$/);
        await expect(
            page.getByRole('link', { name: 'Tableau de bord' }).first(),
        ).toBeVisible();
        await page.close();
    });

    test('⌘K ouvre la recherche', async ({ page }) => {
        await page.goto('/dashboard', { waitUntil: 'networkidle' });
        await page.keyboard.press('ControlOrMeta+k');
        const input = page.getByPlaceholder(/Rechercher une page/);
        await expect(input).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(input).toBeHidden();
    });

    test('la déconnexion renvoie vers la page de connexion', async ({
        browser,
    }) => {
        // Session dédiée : la déconnexion invalide la session, on n'utilise pas celle partagée.
        const page = await browser.newPage({
            storageState: { cookies: [], origins: [] },
        });
        await login(page);
        await page.locator('[data-test="sidebar-menu-button"]').first().click();
        const logoutButton = page.locator('[data-test="logout-button"]');
        test.skip(
            (await logoutButton.count()) === 0,
            'Aucun bouton de déconnexion',
        );
        await logoutButton.click();
        await expect(page).toHaveURL(/\/login$/);
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/\/login$/);
        await page.close();
    });
});
