/** Ce qu'il faut d'un lead ou d'un dossier pour dire son projet en une phrase. */
export type ProjectSentenceInput = {
    /** Libellés des types de bien (« T2 », « Loft »). */
    property_types: string[];
    furnished_label: string | null;
    districts: number[];
    duration_label: string | null;
};

/**
 * Le projet en une phrase, comme on le dirait à un propriétaire :
 * « Cherche T2 meublé dans le 6e ou le 9e pour 2 600 € par mois, moyen terme. »
 * Les quartiers sont dits dans l'ordre, la durée sans sa précision.
 * Partagée par l'aperçu d'un dossier client et la fiche d'un lead.
 */
export function projectSentence(
    project: ProjectSentenceInput,
    budget: string | null,
): string {
    const type =
        project.property_types.length > 0
            ? project.property_types.join(' ou ')
            : 'un logement';
    const furnished =
        project.furnished_label && project.furnished_label !== 'Indifférent'
            ? ` ${project.furnished_label.toLowerCase()}`
            : '';
    const districts = [...project.districts].sort((a, b) => a - b);
    const where =
        districts.length > 0
            ? ` dans le ${districts.map((d) => `${d}e`).join(' ou le ')}`
            : ' à Paris';
    const price = budget ? ` pour ${budget} par mois` : '';
    // « Long terme · 12 mois et plus » : la phrase ne garde que « long terme ».
    const duration = project.duration_label
        ? `, ${project.duration_label.split(' · ')[0]!.toLowerCase()}`
        : '';

    return `Cherche ${type}${furnished}${where}${price}${duration}.`;
}

/** Vrai quand la phrase n'aurait rien à dire : aucun critère renseigné. */
export function hasProjectSentence(
    project: ProjectSentenceInput,
    budget: string | null,
): boolean {
    return (
        project.property_types.length > 0 ||
        project.districts.length > 0 ||
        budget !== null ||
        project.duration_label !== null
    );
}
