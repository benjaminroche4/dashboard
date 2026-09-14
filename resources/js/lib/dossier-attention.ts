import { parisFormat } from '@/lib/datetime';
import type {
    ClientProperty,
    ClientPropertySuggestion,
    DossierReadiness,
    Visit,
} from '@/types';

/** Ce qui retient un dossier, du plus pressant au plus léger. */
export type AttentionTone = 'critical' | 'warning' | 'info';

export type AttentionItem = {
    key: string;
    tone: AttentionTone;
    title: string;
    detail: string | null;
    /** Où agir : un onglet du dossier, ou une page. */
    action: { label: string; tab: string } | { label: string; href: string };
};

const dateTime = parisFormat({
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
});

const order: Record<AttentionTone, number> = {
    critical: 0,
    warning: 1,
    info: 2,
};

/**
 * Ce qui attend sur un dossier, lisible d'un coup d'œil sur l'aperçu : un
 * compte rendu à écrire, une décision du client sur un bien visité, des
 * pièces à vérifier ou à redéposer, la prochaine visite, des biens qui
 * correspondent au projet alors qu'aucun n'est rattaché. Calcul pur : tout
 * vient des props que la page a déjà.
 */
export function dossierAttention({
    visits,
    properties,
    suggestions,
    readiness,
    visitPath,
    now = new Date(),
}: {
    visits: Visit[];
    properties: ClientProperty[];
    suggestions: ClientPropertySuggestion[];
    readiness: DossierReadiness;
    /** Chemin de la fiche d'une visite, pour « Rédiger » et « Voir la visite ». */
    visitPath: (visit: Visit) => string;
    now?: Date;
}): AttentionItem[] {
    const items: AttentionItem[] = [];

    // Comptes rendus en retard : ils bloquent la suite (décision, relance).
    for (const visit of visits.filter((candidate) => candidate.report_due)) {
        items.push({
            key: `report-${visit.uuid}`,
            tone: 'critical',
            title: `Compte rendu à rédiger · ${visit.property.label}`,
            detail: `Visite du ${dateTime.format(new Date(visit.scheduled_at))}.`,
            action: { label: 'Rédiger', href: `${visitPath(visit)}?report=1` },
        });
    }

    // Le client tarde à se positionner sur un bien visité : la relance court.
    for (const property of properties.filter(
        (candidate) => candidate.reminder_at,
    )) {
        items.push({
            key: `decision-${property.uuid}`,
            tone: 'warning',
            title: `Décision du client attendue · ${property.label}`,
            detail: 'Bien visité, rien de tranché : se positionne-t-il ?',
            action: { label: 'Voir le bien', tab: 'biens' },
        });
    }

    if (readiness.refused > 0) {
        items.push({
            key: 'refused',
            tone: 'warning',
            title: `${readiness.refused} pièce${readiness.refused > 1 ? 's' : ''} à redéposer par le client`,
            detail: 'Refusée(s) à la vérification : le client le voit sur sa page de dépôt.',
            action: { label: 'Voir les pièces', tab: 'documents' },
        });
    }

    if (readiness.to_check > 0) {
        items.push({
            key: 'to-check',
            tone: 'warning',
            title: `${readiness.to_check} pièce${readiness.to_check > 1 ? 's' : ''} à vérifier`,
            detail: 'Déposée(s) par le client, à valider ou refuser.',
            action: { label: 'Vérifier', tab: 'documents' },
        });
    }

    const upcoming = visits
        .filter(
            (candidate) =>
                candidate.status === 'planned' &&
                new Date(candidate.scheduled_at) >= now,
        )
        .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))[0];

    if (upcoming) {
        items.push({
            key: `visit-${upcoming.uuid}`,
            tone: 'info',
            title: `Prochaine visite · ${upcoming.property.label}`,
            detail: `${dateTime.format(new Date(upcoming.scheduled_at))}${upcoming.assignee ? ` · ${upcoming.assignee.name}` : ''}.`,
            action: { label: 'Voir la visite', href: visitPath(upcoming) },
        });
    }

    if (readiness.total > 0 && readiness.missing > 0) {
        items.push({
            key: 'missing',
            tone: 'info',
            title: `${readiness.missing} pièce${readiness.missing > 1 ? 's' : ''} encore attendue${readiness.missing > 1 ? 's' : ''} du client`,
            detail: null,
            action: { label: 'Voir les pièces', tab: 'documents' },
        });
    }

    if (properties.length === 0 && suggestions.length > 0) {
        items.push({
            key: 'suggestions',
            tone: 'info',
            title: `${suggestions.length} bien${suggestions.length > 1 ? 's' : ''} correspond${suggestions.length > 1 ? 'ent' : ''} au projet, aucun rattaché`,
            detail: null,
            action: { label: 'Voir les biens', tab: 'biens' },
        });
    }

    return items.sort((a, b) => order[a.tone] - order[b.tone]);
}
