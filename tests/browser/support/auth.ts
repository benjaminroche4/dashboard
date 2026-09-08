import { expect, type Page } from '@playwright/test';

export const credentials = {
    email: process.env.PLAYWRIGHT_EMAIL ?? 'admin@admin.fr',
    password: process.env.PLAYWRIGHT_PASSWORD ?? 'admin',
};

/** Connecte un membre de l'équipe avec les identifiants de dev et attend le tableau de bord. */
export async function login(page: Page): Promise<void> {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(credentials.email);
    await page.locator('input[type="password"]').fill(credentials.password);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.waitForLoadState('networkidle');
}
