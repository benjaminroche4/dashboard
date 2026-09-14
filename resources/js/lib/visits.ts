import type { OfferValue, Visit, VisitModeValue } from '@/types';
import { parisFormat } from '@/lib/datetime';

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

const dayFormat = parisFormat({
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

export const timeFormat = parisFormat({
    hour: '2-digit',
    minute: '2-digit',
});

/** Clé de jour locale `AAAA-MM-JJ` d'une date. */
/**
 * Type de visite d'un client, déduit de sa formule — miroir de
 * `VisitMode::forOffer()`. « Confié », l'équipe visite ; « Accompagné », le
 * client visite lui-même. Ce n'est jamais un choix du formulaire.
 */
export function visitModeForOffer(
    offer: OfferValue | null | undefined,
): VisitModeValue {
    return offer === 'accompagne' ? 'client_alone' : 'for_client';
}

/** Une tournée : le membre qui la réalise, et ses visites dans l'ordre. */
export type VisitTour = {
    /** `all`, l'identifiant du membre, ou `none` pour les visites sans membre. */
    key: string;
    label: string;
    visits: Visit[];
};

/**
 * Tournées d'une journée, une par membre qui réalise des visites : une
 * journée chargée mélange les itinéraires de plusieurs personnes, et une
 * liste unique de cinquante visites ne se suit pas. Les membres sont triés
 * par nom, les visites sans membre finissent la liste.
 */
export function visitTours(visits: Visit[]): VisitTour[] {
    const tours = new Map<string, VisitTour>();

    for (const visit of visits) {
        const key =
            visit.assignee === null ? 'none' : String(visit.assignee.id);
        const label = visit.assignee?.name ?? 'Sans membre';
        const tour = tours.get(key) ?? { key, label, visits: [] };

        tour.visits.push(visit);
        tours.set(key, tour);
    }

    return [...tours.values()].sort((a, b) =>
        a.key === 'none'
            ? 1
            : b.key === 'none'
              ? -1
              : a.label.localeCompare(b.label),
    );
}

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

/**
 * Bien et adresse sur une ligne, **sans répéter le nom** : un bien sans titre
 * est nommé par sa rue, « 78 boulevard Bonnin · 78 boulevard Bonnin, 75014
 * Paris » n'apprend rien à personne.
 */
export function visitPropertyLine(visit: Visit): string {
    const address = visitAddress(visit);
    const label = visit.property.label;

    if (address === '') {
        return label;
    }

    return address.startsWith(label) ? address : `${label} · ${address}`;
}

/** Ce qu'une visite attend encore de quelqu'un. */
export type VisitPendingKind = 'report' | 'client';

export const visitPendingOptions: { value: VisitPendingKind; label: string }[] =
    [
        { value: 'report', label: 'Compte rendu à rédiger (équipe)' },
        { value: 'client', label: 'Retour du client attendu' },
    ];

/**
 * Retours attendus sur une visite : le compte rendu que l'équipe doit
 * encore écrire, puis — une fois écrit — la décision du client sur le bien
 * visité tant qu'elle n'est pas tranchée. Une visite annulée n'attend rien.
 */
export function visitPendingKinds(visit: Visit): VisitPendingKind[] {
    if (visit.status === 'cancelled') {
        return [];
    }

    const kinds: VisitPendingKind[] = [];

    if (visit.report_due) {
        kinds.push('report');
    }

    if (
        visit.status === 'done' &&
        visit.report !== null &&
        visit.outcome === 'pending'
    ) {
        kinds.push('client');
    }

    return kinds;
}
