import type { LeadStatus, LeadStatusOption, OwnerLead } from '@/types';

/** Ordre des colonnes du kanban des leads propriétaires. */
export const ownerKanbanOrder: LeadStatus[] = [
    'todo',
    'in_progress',
    'quote_sent',
    'converted',
    'archived',
];

/** Change la colonne d'un lead, sans toucher aux autres. Pur. */
export function moveOwnerLead(
    leads: OwnerLead[],
    id: number,
    status: LeadStatusOption,
): OwnerLead[] {
    return leads.map((lead) =>
        lead.id === id
            ? { ...lead, status: status.value, status_label: status.label }
            : lead,
    );
}

/** Leads d'une colonne, les plus récents en premier. */
export function ownerColumn(
    leads: OwnerLead[],
    status: LeadStatus,
): OwnerLead[] {
    return leads.filter((lead) => lead.status === status);
}

/** Filtre texte : nom, société, référence, e-mail. */
export function filterOwnerLeads(
    leads: OwnerLead[],
    query: string,
): OwnerLead[] {
    const needle = query.trim().toLowerCase();

    if (needle === '') {
        return leads;
    }

    return leads.filter((lead) =>
        [lead.name, lead.company, lead.reference, lead.email]
            .filter(Boolean)
            .some((value) => (value as string).toLowerCase().includes(needle)),
    );
}
