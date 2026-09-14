import { router, usePage } from '@inertiajs/react';
import { useEchoPresence } from '@laravel/echo-react';
import { notify as toaster } from '@/lib/toast';
import { flushPrefetchCache } from '@/lib/prefetch-cache';
import { recordMissedEvent } from '@/lib/missed-events';

export type DashboardUpdatedEvent = {
    resource: string;
    payload: Record<string, unknown>;
    message: string;
    actor: { id: number; name: string } | null;
    /** Membres qui suivent le lead touché : ceux à qui l'événement parle. */
    concerns?: number[];
    at: string;
};

export type StaffChannelOptions = {
    /** Props Inertia à recharger. Vide = toute la page. */
    only?: string[];
    /** Recharger les props Inertia à chaque événement (défaut : oui). */
    reload?: boolean;
    /** Afficher un toast "<acteur> <message>" (défaut : oui). */
    notify?: boolean;
    onEvent?: (event: DashboardUpdatedEvent) => void;
};

/** « Admin 2 a expédié… », ou « Vous avez … » quand c'est soi-même depuis un autre onglet. */
export function describeEvent(
    event: DashboardUpdatedEvent,
    currentUserId?: number,
): string {
    if (!event.actor) {
        return event.message;
    }

    if (currentUserId !== undefined && event.actor.id === currentUserId) {
        return `Vous (autre onglet) : ${event.message}`;
    }

    return `${event.actor.name} ${event.message}`;
}

/** Vrai si l'événement vise des membres précis (payload `mentions`) dont l'utilisateur courant ne fait pas partie. */
export function targetsOthers(
    event: DashboardUpdatedEvent,
    currentUserId: number,
): boolean {
    const mentions = event.payload.mentions;

    return (
        Array.isArray(mentions) &&
        mentions.length > 0 &&
        !mentions.includes(currentUserId)
    );
}

/** Vrai si l'événement cite l'utilisateur courant (payload `mentions`). */
export function mentionsMe(
    event: DashboardUpdatedEvent,
    currentUserId?: number,
): boolean {
    const mentions = event.payload.mentions;

    return (
        currentUserId !== undefined &&
        Array.isArray(mentions) &&
        mentions.includes(currentUserId) &&
        event.actor?.id !== currentUserId
    );
}

/**
 * Vrai si l'événement parle à l'utilisateur courant : il y est cité, il suit
 * le lead touché, ou c'est sa propre action depuis un autre onglet. Tout le
 * reste recharge en silence — un toast par action de chaque collègue finissait
 * ignoré, y compris celui qui comptait.
 */
export function concernsMe(
    event: DashboardUpdatedEvent,
    currentUserId: number,
): boolean {
    return (
        mentionsMe(event, currentUserId) ||
        event.actor?.id === currentUserId ||
        (Array.isArray(event.concerns) &&
            event.concerns.includes(currentUserId))
    );
}

/**
 * Abonne le composant au canal de présence "staff".
 * À chaque `dashboard.updated` reçu : toast, callback, puis rechargement des
 * props Inertia, sans refresh navigateur. L'onglet qui a fait l'action ne
 * reçoit pas l'événement (exclusion par socket côté serveur), mais les autres
 * onglets et navigateurs du même utilisateur, si.
 */
export function useStaffChannel({
    only = [],
    reload = true,
    notify = true,
    onEvent,
}: StaffChannelOptions = {}) {
    const { auth, realtimeOnly } = usePage().props;
    const currentUserId = auth.user.id;
    // Portée de rechargement : celle du composant, sinon celle déclarée par la page.
    const scope = only.length
        ? only
        : Array.isArray(realtimeOnly)
          ? realtimeOnly.filter((key): key is string => typeof key === 'string')
          : [];

    return useEchoPresence<DashboardUpdatedEvent>(
        'staff',
        '.dashboard.updated',
        (event) => {
            // Événement adressé à d'autres membres (rappels, alertes) : rien à
            // afficher ni à recharger ici.
            if (targetsOthers(event, currentUserId)) {
                return;
            }

            if (notify) {
                if (mentionsMe(event, currentUserId)) {
                    toaster.warning(
                        `${event.actor?.name ?? 'Un membre'} vous a mentionné`,
                        event.message,
                    );
                } else if (concernsMe(event, currentUserId)) {
                    toaster.info(describeEvent(event, currentUserId));
                } else {
                    // Pas pour moi : la page se met à jour, la cloche compte.
                    recordMissedEvent();
                }
            }

            onEvent?.(event);

            // Un autre membre a modifié des données : les pages préchargées sont périmées.
            flushPrefetchCache();

            if (reload) {
                // Rechargement ciblé : les compteurs du menu (leads « À traiter ») suivent toujours.
                router.reload({
                    only: scope.length ? [...scope, 'counts'] : undefined,
                });
            }
        },
        [currentUserId, notify, reload, scope.join(',')],
    );
}
