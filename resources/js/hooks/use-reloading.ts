import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

/** Délai avant de voiler : un rechargement rapide ne doit pas faire clignoter. */
export const RELOADING_DELAY_MS = 150;

/**
 * Vrai pendant qu'une visite Inertia est en cours depuis plus de 150 ms —
 * un rechargement de props après un événement temps réel, un filtre de
 * liste. Le contenu se voile (`[data-reloading]`) au lieu de rester figé
 * sans un mot.
 */
export function useReloading(): boolean {
    const [reloading, setReloading] = useState(false);

    useEffect(() => {
        let timer: number | null = null;

        const offStart = router.on('start', () => {
            timer = window.setTimeout(
                () => setReloading(true),
                RELOADING_DELAY_MS,
            );
        });
        const offFinish = router.on('finish', () => {
            if (timer !== null) {
                window.clearTimeout(timer);
                timer = null;
            }

            setReloading(false);
        });

        return () => {
            offStart();
            offFinish();

            if (timer !== null) {
                window.clearTimeout(timer);
            }
        };
    }, []);

    return reloading;
}
