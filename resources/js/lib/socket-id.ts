import { router } from '@inertiajs/react';
import { echo, echoIsConfigured } from '@laravel/echo-react';

export const SOCKET_HEADER = 'X-Socket-ID';

/**
 * Ajoute l'identifiant de socket Echo aux en-têtes d'une visite Inertia.
 * Le serveur s'en sert pour ne pas renvoyer l'événement à l'onglet auteur.
 */
export function withSocketId(
    headers: Record<string, string>,
    socketId: string | undefined,
): Record<string, string> {
    return socketId ? { ...headers, [SOCKET_HEADER]: socketId } : headers;
}

/** Identifiant de socket courant, ou undefined si Echo n'est pas connecté. */
export function currentSocketId(): string | undefined {
    if (!echoIsConfigured()) {
        return undefined;
    }

    try {
        return echo().socketId() || undefined;
    } catch {
        return undefined;
    }
}

/** Branche l'en-tête sur toutes les visites Inertia (POST, PATCH, reload…). */
export function attachSocketIdToInertia(): VoidFunction {
    return router.on('before', (event) => {
        event.detail.visit.headers = withSocketId(
            event.detail.visit.headers,
            currentSocketId(),
        );
    });
}
