/**
 * Date locale « AAAA-MM-JJ » à `days` jours d'aujourd'hui. Jamais
 * `toISOString().slice(0, 10)` : c'est la date UTC, qui a déjà basculé au
 * lendemain le soir sur une machine à l'ouest de Greenwich (New York après
 * 19 h), alors que l'application compte en minuits locaux.
 */
export function localDateIn(days: number, now = new Date()): string {
    const date = new Date(now);
    date.setDate(date.getDate() + days);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${date.getFullYear()}-${month}-${day}`;
}
