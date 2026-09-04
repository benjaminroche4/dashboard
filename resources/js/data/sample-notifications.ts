import type { Notification } from '@/components/notifications';

/**
 * Notifications d'exemple, le temps de brancher les événements temps réel.
 */
export const sampleNotifications: Notification[] = [
    {
        id: 1,
        title: 'Admin 2 a expédié la commande #1042',
        description: 'Livraison prévue jeudi.',
        at: 'il y a 3 min',
    },
    {
        id: 2,
        title: 'Nouveau membre du staff',
        description: 'Claire Dubois a rejoint l’équipe avec le rôle Manager.',
        at: 'il y a 25 min',
    },
    {
        id: 3,
        title: 'Rapport hebdomadaire disponible',
        description:
            'Semaine 36 : 128 commandes, +12 % par rapport à la semaine dernière.',
        at: 'il y a 2 h',
        read: true,
    },
    {
        id: 4,
        title: 'Mot de passe modifié',
        description:
            'Votre mot de passe a été mis à jour depuis Safari sur Mac.',
        at: 'hier',
        read: true,
    },
    {
        id: 5,
        title: 'Sauvegarde terminée',
        at: 'lundi',
        read: true,
    },
];
