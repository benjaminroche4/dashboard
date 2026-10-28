import {
    FIRST_CONTACT_MINUTES,
    daysUntil,
    leadUrgency,
} from '@/lib/lead-urgency';
import type { Lead } from '@/types';

export type LeadNextStep = {
    /** `late` : rouge, on est en retard ; `due` : ambre, c'est pour aujourd'hui. */
    tone: 'late' | 'due';
    /** Ce qui attend, en une phrase courte. */
    text: string;
    /** Le geste proposé. */
    action: 'recontact' | 'touch';
    /** Libellé du bouton. */
    label: string;
};

const MINUTE = 60_000;
const DAY = 86_400_000;

/**
 * Le prochain geste sur un lead, du plus pressant au plus léger : un
 * recontact en retard, un recontact prévu aujourd'hui, un premier contact
 * qui attend depuis plus de trente minutes, puis un lead sans contact
 * depuis trois jours. Rien sur un lead converti ou archivé, ni quand tout
 * est à jour.
 */
export function leadNextStep(
    lead: Lead,
    now = new Date(),
): LeadNextStep | null {
    if (lead.status === 'converted' || lead.status === 'archived') {
        return null;
    }

    if (lead.recontact_at) {
        const days = daysUntil(lead.recontact_at.slice(0, 10), now);
        const channel = lead.recontact_channel_label
            ? ` · ${lead.recontact_channel_label}`
            : '';

        if (days < 0) {
            return {
                tone: 'late',
                text: `Recontact en retard de ${-days} j${channel}`,
                action: 'recontact',
                label: 'Reporter',
            };
        }

        if (days === 0) {
            return {
                tone: 'due',
                text: `Recontact prévu aujourd'hui${channel}`,
                action: 'touch',
                label: 'Noter le contact',
            };
        }
    }

    if (
        lead.status === 'todo' &&
        lead.last_contacted_at === null &&
        lead.created_at !== null &&
        now.getTime() - new Date(lead.created_at).getTime() >
            FIRST_CONTACT_MINUTES * MINUTE
    ) {
        const minutes = Math.floor(
            (now.getTime() - new Date(lead.created_at).getTime()) / MINUTE,
        );
        const since =
            minutes >= 2 * 24 * 60
                ? `${Math.floor(minutes / (24 * 60))} j`
                : minutes >= 120
                  ? `${Math.floor(minutes / 60)} h`
                  : `${minutes} min`;

        return {
            tone: 'late',
            text: `Premier contact attendu depuis ${since}`,
            action: 'touch',
            label: 'Noter le contact',
        };
    }

    const urgency = leadUrgency(lead, now);

    if (urgency.contact === 'late' || urgency.contact === 'warn') {
        return {
            tone: urgency.contact === 'late' ? 'late' : 'due',
            text: `Sans contact depuis ${urgency.daysSinceContact} j`,
            action: 'recontact',
            label: 'Planifier un recontact',
        };
    }

    return null;
}

/** Jours depuis la création, pour signaler un lead jamais attribué. */
export function daysSinceCreation(lead: Lead, now = new Date()): number | null {
    return lead.created_at
        ? Math.floor(
              (now.getTime() - new Date(lead.created_at).getTime()) / DAY,
          )
        : null;
}

/** Au-delà de ce délai, un lead en cours sans responsable est signalé. */
export const UNASSIGNED_WARN_DAYS = 14;
