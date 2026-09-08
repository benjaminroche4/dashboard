/**
 * Guide de closing de la Converting Machine : les questions à poser au
 * prospect, par thème, avec une astuce pour orienter la réponse. Données
 * pures, sans état : le composant gère les cases cochées.
 */

/** Langue dans laquelle la question est posée au client. */
export type GuideLanguage = 'fr' | 'en';

export const guideLanguages: { value: GuideLanguage; label: string }[] = [
    { value: 'fr', label: 'Français' },
    { value: 'en', label: 'Anglais' },
];

export type ClosingQuestion = {
    /** Identifiant stable, utilisé pour mémoriser les questions posées. */
    id: string;
    /** Sujet en un ou deux mots (« Motivations »). */
    topic: string;
    /** La question, telle qu'on la pose au client, en français. */
    question: string;
    /** La même question, en anglais, pour un client anglophone. */
    questionEn: string;
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
                questionEn:
                    'Where do you live today, and what makes you want to move?',
                tip: 'Bruit, travaux, sécurité, arrivée à Paris pour les études… La raison donne le degré d’urgence et le ton à adopter.',
            },
            {
                id: 'occupants',
                topic: 'Occupants',
                question:
                    'Vous serez combien dans le logement : seul, en couple, en colocation ?',
                questionEn:
                    'How many of you will live in the flat: alone, as a couple, in a flatshare?',
            },
            {
                id: 'pets',
                topic: 'Animaux',
                question: 'Vous avez un animal, un chien ou un chat ?',
                questionEn: 'Do you have a pet, a dog or a cat?',
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
                questionEn:
                    'Are you looking for a furnished or an unfurnished place?',
                tip: 'Le « non meublé total » est rare à Paris : proposer un « légèrement meublé » élargit nettement le choix.',
            },
            {
                id: 'size',
                topic: 'Taille',
                question:
                    'Il vous faut combien de chambres, et quelle surface environ ?',
                questionEn:
                    'How many bedrooms do you need, and roughly what surface area?',
            },
            {
                id: 'layout',
                topic: 'Agencement',
                question:
                    'Il y a des choses auxquelles vous tenez dans l’appartement ?',
                questionEn:
                    'Is there anything in the flat you really care about?',
                tip: 'Cuisine ouverte, balcon, lumière, rangements ou cave. Noter les « indispensables » à part des « souhaits ».',
            },
            {
                id: 'floor',
                topic: 'Étage',
                question:
                    'Le rez-de-chaussée ou le premier étage, c’est envisageable pour vous ?',
                questionEn:
                    'Would a ground floor or first floor be an option for you?',
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
                questionEn: 'Which arrondissements are your first choice?',
                tip: 'Reporter la réponse sur la carte des quartiers visés du formulaire.',
            },
            {
                id: 'excluded',
                topic: 'Secteurs exclus',
                question:
                    'Il y a des arrondissements que vous écartez d’office ?',
                questionEn:
                    'Are there arrondissements you rule out from the start?',
            },
            {
                id: 'proximity',
                topic: 'Proximité',
                question:
                    'Vous devez être proche d’un endroit en particulier, le travail, une école, une université ?',
                questionEn:
                    'Do you need to be close to a specific place, such as work, a school or a university?',
            },
            {
                id: 'surroundings',
                topic: 'Environnement',
                question:
                    'Et le quartier, qu’est-ce qui compte le plus pour vous ?',
                questionEn: 'And the neighbourhood, what matters most to you?',
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
                questionEn:
                    'What is your maximum monthly rent, charges included?',
                tip: 'Bien préciser « charges comprises » et reporter le montant dans le budget du lead.',
            },
            {
                id: 'guarantees',
                topic: 'Garanties',
                question:
                    'Pour le dossier, vous avez un garant, ou vous passez par un organisme ?',
                questionEn:
                    'For the file, do you have a guarantor, or will you go through a guarantee service?',
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
                questionEn:
                    'By what date do you need to be settled in, at the latest?',
                tip: 'Rentrée, fin de bail, fin de séjour à l’hôtel… Une date ferme fixe le rythme des visites.',
            },
            {
                id: 'duration',
                topic: 'Durée',
                question:
                    'C’est pour quelques mois, ou pour vous installer durablement ?',
                questionEn:
                    'Is it for a few months, or are you settling in for the long term?',
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
                questionEn:
                    'Will you be free to do the viewings yourself, or would you rather we take care of everything?',
                tip: 'S’il visite lui-même : formule Accompagné. S’il est loin ou peu disponible : formule Confié, visites comprises.',
            },
        ],
    },
];

/** Texte de la question dans la langue choisie. */
export function questionText(
    question: ClosingQuestion,
    language: GuideLanguage,
): string {
    return language === 'en' ? question.questionEn : question.question;
}

/** Nombre de questions d'un guide. */
export function questionCount(guide: ClosingSection[]): number {
    return guide.reduce(
        (count, section) => count + section.questions.length,
        0,
    );
}

export const closingQuestionCount = questionCount(closingGuide);

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
    guide: ClosingSection[] = closingGuide,
): { section: ClosingSection; question: ClosingQuestion } | null {
    for (const section of guide) {
        const question = section.questions.find(
            (candidate) => !asked.has(candidate.id),
        );

        if (question) {
            return { section, question };
        }
    }

    return null;
}
