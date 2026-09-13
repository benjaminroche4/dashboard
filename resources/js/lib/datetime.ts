/**
 * L'équipe et les clients sont à Paris : le backoffice n'affiche qu'une
 * heure, celle de Paris. Sans ce fuseau explicite, `Intl.DateTimeFormat`
 * suit celui du navigateur — un membre en déplacement, ou une machine réglée
 * sur UTC, lirait un créneau décalé de deux heures.
 */
export const PARIS = 'Europe/Paris';

/**
 * Formateur de date ou d'heure à l'heure de Paris. Tout affichage de date du
 * front passe par là : `new Intl.DateTimeFormat` en direct laisserait le
 * fuseau du navigateur décider.
 */
export function parisFormat(
    options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
    return new Intl.DateTimeFormat('fr-FR', { ...options, timeZone: PARIS });
}

/** « AAAA-MM-JJ » du jour à Paris, pour comparer des journées. */
export function parisDayKey(date: Date): string {
    const parts = parisFormat({
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((candidate) => candidate.type === type)?.value ?? '';

    return `${part('year')}-${part('month')}-${part('day')}`;
}
