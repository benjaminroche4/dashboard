/** Créneaux proposés pour un rendez-vous : de 08:00 à 20:00 par quart d'heure. */
export const TIME_SLOTS: string[] = Array.from(
    { length: 12 * 4 + 1 },
    (_, index) => {
        const minutes = 8 * 60 + index * 15;
        const pad = (n: number) => String(n).padStart(2, '0');

        return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
    },
);

/** Heure proposée par défaut pour un recontact ou un appel. */
export const DEFAULT_TIME = '10:00';

/** Les créneaux, plus l'heure courante si elle n'en fait pas partie (saisie libre ou ancienne valeur). */
export function timeSlotsWith(time: string): string[] {
    return TIME_SLOTS.includes(time) || time === ''
        ? TIME_SLOTS
        : [time, ...TIME_SLOTS];
}

/** Durée d'un appel vidéo avec un lead, en minutes. */
export const VISIO_DURATION_MINUTES = 20;

/** Les créneaux d'un appel vidéo : les mêmes que tout rendez-vous. */
export const VISIO_TIME_SLOTS: string[] = TIME_SLOTS;

/** « AAAA-MM-JJTHH:MM » pour un champ datetime-local, en heure locale. */
export function toLocalInput(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Créneau proposé par défaut : le prochain jour ouvré à 10h00. */
export function defaultSlot(now = new Date()): string {
    const slot = new Date(now);
    slot.setDate(slot.getDate() + 1);
    slot.setHours(10, 0, 0, 0);

    while (slot.getDay() === 0 || slot.getDay() === 6) {
        slot.setDate(slot.getDate() + 1);
    }

    return toLocalInput(slot);
}
