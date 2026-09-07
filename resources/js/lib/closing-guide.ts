/**
 * Guide de closing de la Converting Machine : les questions à poser au
 * prospect, par thème, avec une astuce pour orienter la réponse. Données
 * pures, sans état : le composant gère les cases cochées.
 */

export type ClosingQuestion = {
    /** Identifiant stable, utilisé pour mémoriser les questions posées. */
    id: string;
    /** Sujet en un ou deux mots (« Motivations »). */
    topic: string;
    /** La question, telle qu'on la pose au client. */
    question: string;
    /** Conseil pour le conseiller : quoi préciser, quoi proposer. */
    tip?: string;
};

export type ClosingSection = {
    id: string;
    title: string;
    questions: ClosingQuestion[];
};

export const closingGuide: ClosingSection[] = [
    {
        id: 'profile',
        title: 'Profil et situation du client',
        questions: [
            {
                id: 'motivations',
                topic: 'Motivations',
                question:
                    'Où habitez-vous aujourd’hui, et qu’est-ce qui vous pousse à déménager ?',
                tip: 'Bruit, travaux, sécurité, arrivée à Paris pour les études… La raison donne le degré d’urgence et le ton à adopter.',
            },
            {
                id: 'occupants',
                topic: 'Occupants',
                question:
                    'Vous serez combien dans le logement : seul, en couple, en colocation ?',
            },
            {
                id: 'pets',
                topic: 'Animaux',
                question: 'Vous avez un animal, un chien ou un chat ?',
                tip: 'À préciser dès le départ : beaucoup de propriétaires refusent les animaux, cela filtre les visites.',
            },
        ],
    },
    {
        id: 'criteria',
        title: 'Critères du logement',
        questions: [
            {
                id: 'furnished',
                topic: 'Ameublement',
                question: 'Vous cherchez plutôt meublé ou non meublé ?',
                tip: 'Le « non meublé total » est rare à Paris : proposer un « légèrement meublé » élargit nettement le choix.',
            },
            {
                id: 'size',
                topic: 'Taille',
                question:
                    'Il vous faut combien de chambres, et quelle surface environ ?',
            },
            {
                id: 'layout',
                topic: 'Agencement',
                question:
                    'Il y a des choses auxquelles vous tenez dans l’appartement ?',
                tip: 'Cuisine ouverte, balcon, lumière, rangements ou cave. Noter les « indispensables » à part des « souhaits ».',
            },
            {
                id: 'floor',
                topic: 'Étage',
                question:
                    'Le rez-de-chaussée ou le premier étage, c’est envisageable pour vous ?',
                tip: 'Certains les refusent pour la sécurité ou le bruit. Le savoir avant évite des visites pour rien.',
            },
        ],
    },
    {
        id: 'location',
        title: 'Zone de recherche',
        questions: [
            {
                id: 'districts',
                topic: 'Secteurs favoris',
                question: 'Vous visez quels arrondissements en priorité ?',
                tip: 'Reporter la réponse sur la carte des quartiers visés du formulaire.',
            },
            {
                id: 'excluded',
                topic: 'Secteurs exclus',
                question:
                    'Il y a des arrondissements que vous écartez d’office ?',
            },
            {
                id: 'proximity',
                topic: 'Proximité',
                question:
                    'Vous devez être proche d’un endroit en particulier, le travail, une école, une université ?',
            },
            {
                id: 'surroundings',
                topic: 'Environnement',
                question:
                    'Et le quartier, qu’est-ce qui compte le plus pour vous ?',
                tip: 'Calme absolu, sécurité, commerces, cour ou parc pour le chien. Une priorité suffit pour orienter la recherche.',
            },
        ],
    },
    {
        id: 'budget',
        title: 'Budget et dossier',
        questions: [
            {
                id: 'rent',
                topic: 'Loyer',
                question: 'Quel loyer maximum par mois, charges comprises ?',
                tip: 'Bien préciser « charges comprises » et reporter le montant dans le budget du lead.',
            },
            {
                id: 'guarantees',
                topic: 'Garanties',
                question:
                    'Pour le dossier, vous avez un garant, ou vous passez par un organisme ?',
                tip: 'Garant physique (souvent un parent) ou organisme agréé comme Garantme ou Visale. Sans garantie, cadrer les attentes tout de suite.',
            },
        ],
    },
    {
        id: 'timeline',
        title: 'Calendrier',
        questions: [
            {
                id: 'deadline',
                topic: 'Date limite',
                question:
                    'Vous devez être installé pour quelle date, au plus tard ?',
                tip: 'Rentrée, fin de bail, fin de séjour à l’hôtel… Une date ferme fixe le rythme des visites.',
            },
            {
                id: 'duration',
                topic: 'Durée',
                question:
                    'C’est pour quelques mois, ou pour vous installer durablement ?',
                tip: 'Court terme : plutôt meublé et bail mobilité. Longue durée : bail classique, dossier plus exigeant.',
            },
        ],
    },
    {
        id: 'package',
        title: 'Accompagnement proposé',
        questions: [
            {
                id: 'service',
                topic: 'Choix du service',
                question:
                    'Vous pourrez vous libérer pour faire les visites, ou vous préférez qu’on s’occupe de tout ?',
                tip: 'S’il visite lui-même : formule Accompagné. S’il est loin ou peu disponible : formule Confié, visites comprises.',
            },
        ],
    },
];

export const closingQuestionCount = closingGuide.reduce(
    (count, section) => count + section.questions.length,
    0,
);

/** Nombre de questions posées dans une section. */
export function sectionProgress(
    section: ClosingSection,
    asked: ReadonlySet<string>,
): { asked: number; total: number } {
    return {
        asked: section.questions.filter((question) => asked.has(question.id))
            .length,
        total: section.questions.length,
    };
}

/** Prochaine question non posée, dans l’ordre du guide, ou `null` si tout est fait. */
export function nextQuestion(
    asked: ReadonlySet<string>,
): { section: ClosingSection; question: ClosingQuestion } | null {
    for (const section of closingGuide) {
        const question = section.questions.find(
            (candidate) => !asked.has(candidate.id),
        );

        if (question) {
            return { section, question };
        }
    }

    return null;
}
