import type { Lead, Visit } from '@/types';

/** Un bloc de la vue « Aujourd'hui » : quelques lignes, et le total réel. */
export type TodayBlock<T> = { items: T[]; total: number };

export type TodayDecision = {
    lead: { uuid: string; name: string };
    property: { uuid: string; label: string };
    /** Le délai de relance est passé : la décision traîne. */
    due: boolean;
};

export type TodayDocuments = { uuid: string; name: string; count: number };

/** Ce qu'un membre a à faire maintenant ; null = section fermée pour lui. */
export type Today = {
    visits: Visit[] | null;
    reports_due: TodayBlock<Visit> | null;
    first_contacts: TodayBlock<Lead> | null;
    recontacts: TodayBlock<Lead> | null;
    decisions: TodayBlock<TodayDecision> | null;
    documents_to_review: TodayBlock<TodayDocuments> | null;
};
