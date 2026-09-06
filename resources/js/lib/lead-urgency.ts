import type { Lead } from '@/types';

export type ContactUrgency = 'ok' | 'warn' | 'late' | 'none';

export type LeadUrgency = {
    /** Sans contact depuis 3 jours : warn ; 7 jours : late. Leads clos : none. */
    contact: ContactUrgency;
    daysSinceContact: number | null;
    /** Jours avant l'arrivée si elle est dans moins de 30 jours (0 = aujourd'hui, négatif = passée). */
    arrivalInDays: number | null;
};

const DAY = 86_400_000;

/** En dessous de ce délai avant l'emménagement, la Converting Machine alerte. */
export const URGENT_ARRIVAL_DAYS = 20;

/** Jours entre aujourd'hui et une date ISO (0 = aujourd'hui, négatif = passée). */
export function daysUntil(dateIso: string, now = new Date()): number {
    return Math.ceil(
        (new Date(`${dateIso}T00:00:00`).getTime() -
            new Date(now.toDateString()).getTime()) /
            DAY,
    );
}

/** Vrai si l'emménagement est dans moins de 20 jours (date passée comprise). */
export function isUrgentArrival(dateIso: string, now = new Date()): boolean {
    return dateIso !== '' && daysUntil(dateIso, now) < URGENT_ARRIVAL_DAYS;
}

function daysBetween(from: string, to: Date): number {
    return Math.floor((to.getTime() - new Date(from).getTime()) / DAY);
}

/** Signaux d'action pour une carte : relance en retard, arrivée imminente. */
export function leadUrgency(lead: Lead, now = new Date()): LeadUrgency {
    const closed = lead.status === 'converted' || lead.status === 'archived';
    const reference = lead.last_contacted_at ?? lead.created_at;
    const daysSinceContact = reference ? daysBetween(reference, now) : null;

    let contact: ContactUrgency = 'none';

    if (!closed && daysSinceContact !== null) {
        contact =
            daysSinceContact >= 7
                ? 'late'
                : daysSinceContact >= 3
                  ? 'warn'
                  : 'ok';
    }

    let arrivalInDays: number | null = null;

    if (!closed && lead.arrival_at) {
        const days = daysUntil(lead.arrival_at, now);

        if (days <= 30) {
            arrivalInDays = days;
        }
    }

    return { contact, daysSinceContact, arrivalInDays };
}
