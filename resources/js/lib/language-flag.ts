/**
 * Drapeau d'une langue de contact : le Royaume-Uni pour l'anglais, la France
 * sinon. Une seule source pour les listes, les formulaires et les volets.
 */
export function languageFlag(language: string | null | undefined): string {
    return language === 'en' ? 'GB' : 'FR';
}
