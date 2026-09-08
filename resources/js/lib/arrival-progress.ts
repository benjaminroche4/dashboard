import { daysUntil, URGENT_ARRIVAL_DAYS } from '@/lib/lead-urgency';

export type ArrivalState = 'unknown' | 'upcoming' | 'soon' | 'arrived';

/** Couleur d'alerte : vert quand l'arrivée est loin, rouge quand elle est imminente ou passée. */
export type ArrivalTone =
    | 'none'
    | 'green'
    | 'yellow'
    | 'amber'
    | 'orange'
    | 'red';

export type ArrivalProgress = {
    /** Part du délai écoulée entre la conversion et l'arrivée, de 0 à 100. */
    percent: number;
    /** Jours restants avant l'arrivée (négatif une fois arrivé), null sans date. */
    daysLeft: number | null;
    state: ArrivalState;
    tone: ArrivalTone;
};

/** Paliers de l'alerte, en jours restants : au-delà de 60 j vert, puis jaune, ambre, orange, rouge sous 8 j. */
export const ARRIVAL_TONE_STEPS: { maxDays: number; tone: ArrivalTone }[] = [
    { maxDays: 7, tone: 'red' },
    { maxDays: 14, tone: 'orange' },
    { maxDays: 30, tone: 'amber' },
    { maxDays: 60, tone: 'yellow' },
];

export function arrivalTone(daysLeft: number | null): ArrivalTone {
    if (daysLeft === null) {
        return 'none';
    }

    return (
        ARRIVAL_TONE_STEPS.find((step) => daysLeft <= step.maxDays)?.tone ??
        'green'
    );
}

const DAY_MS = 86_400_000;

/** Durée supposée du dossier quand la date de conversion manque. */
const FALLBACK_DAYS = 90;

/**
 * Avancement d'un dossier client vers la date d'arrivée : la barre part de la
 * conversion (ou de 90 jours avant l'arrivée à défaut) et se remplit jusqu'au
 * jour J. Pur, pour les tests.
 */
export function arrivalProgress(
    convertedAt: string | null,
    arrivalAt: string | null,
    now = new Date(),
): ArrivalProgress {
    if (!arrivalAt) {
        return { percent: 0, daysLeft: null, state: 'unknown', tone: 'none' };
    }

    const daysLeft = daysUntil(arrivalAt, now);
    const arrival = new Date(`${arrivalAt}T00:00:00`).getTime();
    const start = convertedAt
        ? new Date(convertedAt).getTime()
        : arrival - FALLBACK_DAYS * DAY_MS;
    const total = Math.max(arrival - start, DAY_MS);
    const elapsed = now.getTime() - start;
    const percent = Math.round(
        Math.min(100, Math.max(0, (elapsed / total) * 100)),
    );

    const tone = arrivalTone(daysLeft);

    if (daysLeft < 0) {
        return { percent: 100, daysLeft, state: 'arrived', tone };
    }

    return {
        percent,
        daysLeft,
        state: daysLeft <= URGENT_ARRIVAL_DAYS ? 'soon' : 'upcoming',
        tone,
    };
}

/** « J-12 », « Arrive aujourd’hui », « Arrivé(e) depuis 3 j ». */
export function arrivalLabel(progress: ArrivalProgress): string {
    if (progress.daysLeft === null) {
        return 'Arrivée non renseignée';
    }

    if (progress.daysLeft < 0) {
        return `Arrivé(e) depuis ${-progress.daysLeft} j`;
    }

    if (progress.daysLeft === 0) {
        return 'Arrive aujourd’hui';
    }

    return `J-${progress.daysLeft}`;
}
