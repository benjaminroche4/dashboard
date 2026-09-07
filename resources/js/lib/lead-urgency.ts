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

/** Délai, en minutes, pour un premier contact après la création d'un lead. */
export const FIRST_CONTACT_MINUTES = 30;

const MINUTE = 60_000;

export type FirstContactTimer = {
    /** Heure limite du premier contact (création + 30 min). */
    dueAt: Date;
    /** Minutes restantes (arrondies au supérieur), 0 une fois le délai passé. */
    remainingMinutes: number;
    /** Minutes de retard, 0 tant que le délai court. */
    lateMinutes: number;
    /** Secondes restantes puis secondes de retard, pour le chrono en direct. */
    remainingSeconds: number;
    lateSeconds: number;
    late: boolean;
};

/**
 * Compte à rebours du premier contact : un lead « À traiter » jamais contacté doit l'être
 * dans les 30 minutes suivant sa création. Null si le lead a déjà été contacté, a changé
 * de statut, ou attend depuis plus d'un jour (le badge « Sans contact depuis n j » prend le relais).
 */
export function firstContactTimer(
    lead: Pick<Lead, 'status' | 'created_at' | 'last_contacted_at'>,
    now = new Date(),
): FirstContactTimer | null {
    if (
        lead.status !== 'todo' ||
        lead.last_contacted_at !== null ||
        !lead.created_at
    ) {
        return null;
    }

    const dueAt = new Date(
        new Date(lead.created_at).getTime() + FIRST_CONTACT_MINUTES * MINUTE,
    );
    const diff = dueAt.getTime() - now.getTime();

    if (diff <= -DAY) {
        return null;
    }

    return {
        dueAt,
        remainingMinutes: Math.max(0, Math.ceil(diff / MINUTE)),
        lateMinutes: Math.max(0, Math.floor(-diff / MINUTE)),
        remainingSeconds: Math.max(0, Math.ceil(diff / 1000)),
        lateSeconds: Math.max(0, Math.floor(-diff / 1000)),
        late: diff <= 0,
    };
}

const pad = (value: number): string => String(value).padStart(2, '0');

/** Chrono « mm:ss », puis « h:mm:ss » à partir d'une heure. */
export function formatClock(totalSeconds: number): string {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = seconds % 60;

    return hours > 0
        ? `${hours}:${pad(minutes)}:${pad(rest)}`
        : `${pad(minutes)}:${pad(rest)}`;
}

/** Texte du badge : « À contacter · 27:12 » puis « En retard · +12:05 ». */
export function firstContactLabel(timer: FirstContactTimer): string {
    return timer.late
        ? `En retard · +${formatClock(timer.lateSeconds)}`
        : `À contacter · ${formatClock(timer.remainingSeconds)}`;
}
