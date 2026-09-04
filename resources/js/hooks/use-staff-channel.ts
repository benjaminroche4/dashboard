import { router, usePage } from '@inertiajs/react';
import { useEchoPresence } from '@laravel/echo-react';
import { toast } from 'sonner';

export type DashboardUpdatedEvent = {
    resource: string;
    payload: Record<string, unknown>;
    message: string;
    actor: { id: number; name: string } | null;
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

export function describeEvent(event: DashboardUpdatedEvent): string {
    return event.actor ? `${event.actor.name} ${event.message}` : event.message;
}

/**
 * Abonne le composant au canal de présence "staff".
 * À chaque `dashboard.updated` émis par un AUTRE membre : toast, callback,
 * puis rechargement des props Inertia, sans refresh navigateur.
 * Les événements émis par l'utilisateur courant sont ignorés.
 */
export function useStaffChannel({
    only = [],
    reload = true,
    notify = true,
    onEvent,
}: StaffChannelOptions = {}) {
    const currentUserId = usePage().props.auth.user.id;

    return useEchoPresence<DashboardUpdatedEvent>(
        'staff',
        '.dashboard.updated',
        (event) => {
            if (event.actor?.id === currentUserId) {
                return;
            }

            if (notify) {
                toast.info(describeEvent(event));
            }

            onEvent?.(event);

            if (reload) {
                router.reload({ only: only.length ? only : undefined });
            }
        },
        [currentUserId, notify, reload, only.join(',')],
    );
}
