import { router } from '@inertiajs/react';

/**
 * Les liens de navigation sont préchargés au survol (`prefetch`) et Inertia
 * garde la réponse en cache 30 s. Après une mutation, une liste préchargée
 * serait donc périmée : on vide le cache avant toute visite non-GET, et le
 * hook temps réel l'appelle aussi à chaque événement reçu.
 */
export function flushPrefetchCache(): void {
    router.flushAll();
}

/** Vide le cache de préchargement avant chaque mutation (POST, PUT, PATCH, DELETE). */
export function flushPrefetchOnMutations(): VoidFunction {
    return router.on('before', (event) => {
        if (event.detail.visit.method.toLowerCase() !== 'get') {
            flushPrefetchCache();
        }
    });
}
