import type { DocumentSubject } from '@/types';

/**
 * Identifiants de rattachement d'un devis ou d'une facture : un document part
 * avec `lead_id` **ou** `partner_id`, jamais les deux.
 */
export function subjectLinks(subject: DocumentSubject | null): {
    lead_id: number | null;
    partner_id: number | null;
} {
    return {
        lead_id: subject?.kind === 'lead' ? subject.id : null,
        partner_id: subject?.kind === 'partner' ? subject.id : null,
    };
}

/** « le lead » ou « le partenaire », pour la phrase d'en-tête du formulaire. */
export function subjectLabel(subject: DocumentSubject): string {
    return subject.kind === 'lead' ? 'le lead' : 'le partenaire';
}
