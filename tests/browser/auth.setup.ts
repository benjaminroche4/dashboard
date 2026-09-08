import { test as setup } from '@playwright/test';
import { authFile } from '../../playwright.config';
import { login } from './support/auth';

setup('connexion et enregistrement de la session', async ({ page }) => {
    await login(page);
    await page.context().storageState({ path: authFile });
});
