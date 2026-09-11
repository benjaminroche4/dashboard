import type { Visit } from '@/types';

/** Un jour de visites : clé `AAAA-MM-JJ`, libellé et visites triées par heure. */
export type VisitDay = {
    key: string;
    date: Date;
    /** « mardi 8 septembre 2026 » */
    label: string;
    /** « Aujourd'hui », « Demain », « Hier », sinon null. */
    relative: string | null;
    /** Jour passé (avant aujourd'hui). */
    past: boolean;
    visits: Visit[];
};

const dayFormat = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

export const timeFormat = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
});

/** Clé de jour locale `AAAA-MM-JJ` d'une date. */
export function dayKey(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${date.getFullYear()}-${month}-${day}`;
}

/** Minuit local d'une clé de jour. */
function dayStart(key: string): Date {
    const [year, month, day] = key.split('-').map(Number);

    return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

function relativeLabel(key: string, now: Date): string | null {
    const today = dayStart(dayKey(now));
    const diff = Math.round(
        (dayStart(key).getTime() - today.getTime()) / 86_400_000,
    );

    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return 'Demain';
    if (diff === -1) return 'Hier';

    return null;
}

/**
 * Visites regroupées par jour : aujourd'hui, puis les jours à venir du plus
 * proche au plus lointain, puis les jours passés du plus récent au plus
 * ancien. Dans un jour, les visites sont triées par heure.
 */
export function groupVisitsByDay(
    visits: Visit[],
    now = new Date(),
): VisitDay[] {
    const byDay = new Map<string, Visit[]>();

    for (const visit of visits) {
        const key = dayKey(new Date(visit.scheduled_at));
        byDay.set(key, [...(byDay.get(key) ?? []), visit]);
    }

    const todayKey = dayKey(now);
    const days = [...byDay.entries()].map(([key, list]): VisitDay => ({
        key,
        date: dayStart(key),
        label: dayFormat.format(dayStart(key)),
        relative: relativeLabel(key, now),
        past: key < todayKey,
        visits: [...list].sort(
            (a, b) =>
                new Date(a.scheduled_at).getTime() -
                new Date(b.scheduled_at).getTime(),
        ),
    }));

    const upcoming = days
        .filter((day) => !day.past)
        .sort((a, b) => a.key.localeCompare(b.key));
    const past = days
        .filter((day) => day.past)
        .sort((a, b) => b.key.localeCompare(a.key));

    return [...upcoming, ...past];
}

/**
 * Visites tenues à l'écran : celles à venir (aujourd'hui compris) et, dans le
 * passé, seulement celles dont le compte rendu reste à écrire. Une visite
 * passée déjà racontée ou annulée n'encombre plus la liste.
 */
export function openVisits(visits: Visit[], now = new Date()): Visit[] {
    const todayKey = dayKey(now);

    return visits.filter(
        (visit) =>
            dayKey(new Date(visit.scheduled_at)) >= todayKey ||
            visit.report_due,
    );
}

/**
 * Jour affiché par défaut sur la carte : aujourd'hui s'il a des visites,
 * sinon le prochain jour à venir, sinon le dernier jour passé.
 */
export function defaultVisitDay(
    days: VisitDay[],
    now = new Date(),
): VisitDay | null {
    const todayKey = dayKey(now);

    return (
        days.find((day) => day.key === todayKey) ??
        days.find((day) => !day.past) ??
        days[0] ??
        null
    );
}

/** Jours triés chronologiquement, pour naviguer de la veille au lendemain. */
export function chronologicalDays(days: VisitDay[]): VisitDay[] {
    return [...days].sort((a, b) => a.key.localeCompare(b.key));
}

/** Adresse du bien sur une ligne. */
export function visitAddress(visit: Visit): string {
    const { property } = visit;
    const line = [property.postal_code, property.city]
        .filter(Boolean)
        .join(' ');

    return [property.street, line].filter(Boolean).join(', ');
}
