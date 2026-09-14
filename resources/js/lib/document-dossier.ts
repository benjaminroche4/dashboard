import type { DocumentRequestDetail, DocumentUpload } from '@/types';

/** Une pièce du dossier fusionné, à sa place dans le PDF final. */
export type DossierPart = {
    /** Personne à qui la pièce appartient. */
    person: string;
    /** « Locataire » ou « Garant ». */
    role: string;
    /** Catégorie du catalogue (Identité, Finance…). */
    category: string;
    /** Libellé de la pièce demandée. */
    document: string;
    upload: DocumentUpload;
};

/**
 * Ordre du dossier fusionné : **les personnes dans l'ordre du foyer**
 * (locataires d'abord, garants ensuite), puis pour chacune ses pièces dans
 * l'ordre du catalogue (catégorie puis position), et pour chaque pièce ses
 * fichiers dans l'ordre de dépôt.
 *
 * Le serveur envoie déjà `persons` dans cet ordre : on ne fait que l'aplatir,
 * en écartant les pièces sans fichier **et les fichiers refusés par l'équipe**,
 * qui ne sont pas valides et n'ont pas à partir dans le dossier.
 */
export function dossierPlan(request: DocumentRequestDetail): DossierPart[] {
    const parts: DossierPart[] = [];
    const tenants = request.persons.filter(
        (person) => !isGuarantor(person.role),
    );
    const guarantors = request.persons.filter((person) =>
        isGuarantor(person.role),
    );

    for (const person of [...tenants, ...guarantors]) {
        for (const category of person.categories) {
            for (const document of category.documents) {
                // `uploads` n'est servi que par la fiche d'une liste.
                for (const upload of document.uploads ?? []) {
                    // Rien ne sort du backoffice sans qu'un membre l'ait vu :
                    // une pièce à vérifier attend, une pièce refusée reste dehors.
                    if (upload.status !== 'accepted') {
                        continue;
                    }

                    parts.push({
                        person: person.name,
                        role: person.role,
                        category: category.label,
                        document: document.label,
                        upload,
                    });
                }
            }
        }
    }

    return parts;
}

/** Le rôle est libellé (« Garant », « Guarantor ») : on compare sans casse. */
function isGuarantor(role: string): boolean {
    return role.toLowerCase().startsWith('garant');
}

/** Poids total des pièces à fusionner, en octets. */
export function dossierWeight(parts: DossierPart[]): number {
    return parts.reduce((total, part) => total + part.upload.size, 0);
}

/** Nom du fichier téléchargé : « dossier-lea-durand.pdf ». */
export function dossierFileName(name: string): string {
    const slug = name
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    return `dossier-${slug === '' ? 'client' : slug}.pdf`;
}
