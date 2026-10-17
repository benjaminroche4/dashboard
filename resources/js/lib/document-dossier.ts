import { sectionLabel, sectionRank } from '@/lib/dossier-sections';
import type { DocumentRequestDetail, DocumentUpload } from '@/types';

/** Une pièce du dossier fusionné, à sa place dans le PDF final. */
export type DossierPart = {
    /** Personne à qui la pièce appartient. */
    person: string;
    /** « Locataire » ou « Garant ». */
    role: string;
    /** Catégorie du catalogue (Identité, Finance…). */
    category: string;
    /** Partie du dossier (« income »), celle de la fiche qui précède la pièce. */
    section: string;
    /** Libellé de la pièce demandée. */
    document: string;
    upload: DocumentUpload;
};

/** Une partie du dossier : une personne, un thème, et ses pièces dans l'ordre. */
export type DossierSectionPlan = {
    /** « 0-income » : la clé de la fiche récapitulative côté serveur. */
    key: string;
    personIndex: number;
    person: string;
    role: string;
    section: string;
    label: string;
    parts: DossierPart[];
};

/**
 * Ordre du dossier fusionné, miroir de `App\Support\DossierPlan` : **les
 * personnes dans l'ordre du foyer** (locataires d'abord, garants ensuite),
 * puis pour chacune les **parties** du dossier (`dossierSections` : identité,
 * situation professionnelle, revenus, impôts, épargne…), dans une partie les
 * pièces dans l'ordre du catalogue, et pour chaque pièce ses fichiers dans
 * l'ordre de dépôt.
 *
 * Seules les pièces **validées par l'équipe** en font partie : une pièce à
 * vérifier attend, une pièce refusée reste dehors. Une partie sans fichier
 * validé n'existe pas.
 */
export function dossierSections(
    request: DocumentRequestDetail,
): DossierSectionPlan[] {
    const sections: DossierSectionPlan[] = [];
    const ordered = request.persons
        .map((person, index) => ({ person, index }))
        .sort(
            (a, b) =>
                Number(isGuarantor(a.person.role)) -
                Number(isGuarantor(b.person.role)),
        );

    for (const { person, index } of ordered) {
        const byTheme = new Map<string, DossierPart[]>();

        for (const category of person.categories) {
            for (const document of category.documents) {
                const section = document.section ?? 'other';

                // `uploads` n'est servi que par la fiche d'une liste.
                for (const upload of document.uploads ?? []) {
                    if (upload.status !== 'accepted') {
                        continue;
                    }

                    const parts = byTheme.get(section) ?? [];
                    parts.push({
                        person: person.name,
                        role: person.role,
                        category: category.label,
                        section,
                        document: document.label,
                        upload,
                    });
                    byTheme.set(section, parts);
                }
            }
        }

        for (const [section, parts] of [...byTheme.entries()].sort(
            ([a], [b]) => sectionRank(a) - sectionRank(b),
        )) {
            sections.push({
                key: `${index}-${section}`,
                personIndex: index,
                person: person.name,
                role: person.role,
                section,
                label: sectionLabel(section),
                parts,
            });
        }
    }

    return sections;
}

/** Les pièces du dossier à plat, dans l'ordre du PDF final. */
export function dossierPlan(request: DocumentRequestDetail): DossierPart[] {
    return dossierSections(request).flatMap((section) => section.parts);
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
