import { router } from '@inertiajs/react';
import { useEchoPresence } from '@laravel/echo-react';

export type DashboardUpdatedEvent = {
    resource: string;
    payload: Record<string, unknown>;
    at: string;
};

/**
 * Abonne le composant au canal de présence "staff".
 * À chaque événement `dashboard.updated`, les props Inertia listées dans
 * `only` sont rechargées (ou toute la page si `only` est vide),
 * sans refresh navigateur.
 */
export function useStaffChannel(
    only: string[] = [],
    onEvent?: (event: DashboardUpdatedEvent) => void,
) {
    return useEchoPresence<DashboardUpdatedEvent>(
        'staff',
        '.dashboard.updated',
        (event) => {
            onEvent?.(event);
            router.reload({ only: only.length ? only : undefined });
        },
    );
}
