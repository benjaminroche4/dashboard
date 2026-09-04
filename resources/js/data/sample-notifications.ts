import type { Notification } from '@/components/notifications';

/**
 * Notifications d'exemple, le temps de brancher les événements temps réel.
 */
export const sampleNotifications: Notification[] = [
    {
        id: 1,
        kind: 'order',
        actor: { name: 'Admin 2', role: 'Administrateur' },
        title: 'a expédié la commande #1042',
        description: 'Livraison prévue jeudi.',
        at: 'il y a 3 min',
        group: "Aujourd'hui",
    },
    {
        id: 2,
        kind: 'staff',
        actor: { name: 'Claire Dubois', role: 'Manager' },
        title: 'a rejoint le staff',
        description: 'Invitée par Admin avec le rôle Manager.',
        at: 'il y a 25 min',
        group: "Aujourd'hui",
    },
    {
        id: 3,
        kind: 'report',
        actor: { name: 'Système' },
        title: 'a publié le rapport hebdomadaire',
        description: 'Semaine 36 : 128 commandes, +12 % sur une semaine.',
        at: 'il y a 2 h',
        read: true,
        group: "Aujourd'hui",
    },
    {
        id: 4,
        kind: 'security',
        actor: { name: 'Admin', role: 'Administrateur' },
        title: 'a modifié son mot de passe',
        description: 'Depuis Safari sur Mac.',
        at: 'hier',
        read: true,
        group: 'Hier',
    },
    {
        id: 5,
        kind: 'system',
        actor: { name: 'Système' },
        title: 'a terminé la sauvegarde',
        at: 'lundi',
        read: true,
        group: 'Plus tôt',
    },
];
