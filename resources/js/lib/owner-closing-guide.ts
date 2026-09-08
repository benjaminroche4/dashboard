import type { ClosingSection } from '@/lib/closing-guide';

/**
 * Guide de closing de la Converting Machine propriétaire : les questions à
 * poser à un propriétaire qui confie un bien, par thème, avec une astuce.
 */
export const ownerClosingGuide: ClosingSection[] = [
    {
        id: 'property',
        title: 'Le bien',
        questions: [
            {
                id: 'description',
                topic: 'Description',
                question:
                    'Pouvez-vous me décrire le bien : type, surface, étage, état général ?',
                questionEn:
                    'Can you describe the property: type, surface area, floor, overall condition?',
                tip: 'Reporter les réponses dans l’étape « Détail du bien ». Un étage sans ascenseur ou un rez-de-chaussée change la cible de locataires.',
            },
            {
                id: 'furnished',
                topic: 'Ameublement',
                question: 'Il se loue meublé ou vide ?',
                questionEn: 'Is it rented furnished or unfurnished?',
                tip: 'Le meublé plaît aux expatriés et aux courts séjours, avec un loyer plus élevé et un bail plus souple.',
            },
            {
                id: 'works',
                topic: 'Travaux',
                question:
                    'Des travaux récents, ou des choses à prévoir avant de louer ?',
                questionEn:
                    'Any recent renovation, or work to plan before renting?',
                tip: 'Peinture, électroménager, diagnostics : anticiper ce qui retarderait la mise en location.',
            },
        ],
    },
    {
        id: 'situation',
        title: 'Situation actuelle',
        questions: [
            {
                id: 'occupancy',
                topic: 'Occupation',
                question:
                    'Le bien est libre aujourd’hui, ou encore occupé ? Depuis quand ?',
                questionEn:
                    'Is the property vacant today, or still occupied? Since when?',
                tip: 'Un bien vide depuis longtemps coûte au propriétaire : c’est un levier pour conclure vite.',
            },
            {
                id: 'history',
                topic: 'Historique',
                question: 'Vous l’avez déjà loué ? Comment ça s’est passé ?',
                questionEn: 'Have you rented it out before? How did it go?',
                tip: 'Impayés, dégradations, vacance : noter ce qui l’a déçu, notre offre doit y répondre.',
            },
            {
                id: 'management',
                topic: 'Gestion',
                question:
                    'Qui s’en occupe aujourd’hui : vous-même, une agence ?',
                questionEn: 'Who takes care of it today: yourself, an agency?',
                tip: 'S’il est déjà en agence, demander ce qui manque. S’il gère seul, insister sur le temps gagné.',
            },
        ],
    },
    {
        id: 'expectations',
        title: 'Attentes',
        questions: [
            {
                id: 'rent',
                topic: 'Loyer',
                question:
                    'Quel loyer visez-vous, hors charges, et quel montant de charges ?',
                questionEn:
                    'What rent are you aiming for, excluding charges, and how much are the charges?',
                tip: 'Comparer tout de suite avec le marché du quartier et l’encadrement des loyers à Paris.',
            },
            {
                id: 'tenant',
                topic: 'Locataire idéal',
                question: 'Quel profil de locataire souhaitez-vous ?',
                questionEn: 'What kind of tenant are you looking for?',
                tip: 'Salariés en mobilité, expatriés, familles : c’est justement notre vivier. Le dire.',
            },
            {
                id: 'duration',
                topic: 'Durée',
                question:
                    'Plutôt une longue durée, ou du court terme et des baux mobilité ?',
                questionEn:
                    'Rather a long-term lease, or short stays and mobility leases?',
            },
        ],
    },
    {
        id: 'conditions',
        title: 'Conditions de location',
        questions: [
            {
                id: 'guarantees',
                topic: 'Garanties',
                question:
                    'Quelles garanties attendez-vous : garant, assurance loyers impayés, dépôt ?',
                questionEn:
                    'What guarantees do you expect: guarantor, rent insurance, deposit?',
                tip: 'Rassurer avec les organismes agréés (Garantme, Visale) et la sélection des dossiers.',
            },
            {
                id: 'lease',
                topic: 'Bail',
                question:
                    'Vous avez une idée du type de bail que vous voulez ?',
                questionEn:
                    'Do you have an idea of the type of lease you want?',
                tip: 'Loi Alur, code civil, bail mobilité : expliquer en une phrase ce que chacun permet.',
            },
            {
                id: 'pets',
                topic: 'Animaux',
                question: 'Les animaux, c’est envisageable ?',
                questionEn: 'Would pets be an option?',
                tip: 'Ouvrir aux animaux élargit nettement le nombre de candidats.',
            },
        ],
    },
    {
        id: 'timeline',
        title: 'Calendrier',
        questions: [
            {
                id: 'availability',
                topic: 'Disponibilité',
                question: 'À partir de quand le bien peut-il être proposé ?',
                questionEn: 'From when can the property be offered?',
                tip: 'Reporter la date dans le formulaire : elle fixe le rythme des visites et des annonces.',
            },
            {
                id: 'visits',
                topic: 'Visites',
                question:
                    'Quand peut-on organiser des visites, et qui aura les clés ?',
                questionEn:
                    'When can we organise viewings, and who will have the keys?',
                tip: 'Un jeu de clés chez nous permet des visites sans le propriétaire : proposer tout de suite.',
            },
        ],
    },
    {
        id: 'mandate',
        title: 'Mandat proposé',
        questions: [
            {
                id: 'service',
                topic: 'Choix du service',
                question:
                    'Vous voulez qu’on trouve le locataire seulement, ou aussi qu’on gère la location au quotidien ?',
                questionEn:
                    'Do you want us to find the tenant only, or also to manage the rental day to day?',
                tip: 'Recherche seule : mise en location. Gestion locative : loyers, quittances, incidents, sans souci pour lui.',
            },
            {
                id: 'decision',
                topic: 'Décision',
                question:
                    'Qui décide, et qu’est-ce qui vous ferait signer avec nous ?',
                questionEn:
                    'Who decides, and what would make you sign with us?',
                tip: 'Identifier les co-décideurs (conjoint, indivision) et l’objection principale avant d’envoyer le mandat.',
            },
        ],
    },
];
