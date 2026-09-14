import { useSyncExternalStore } from 'react';

/**
 * Événements temps réel reçus **sans toast** depuis la dernière consultation :
 * ce qui a changé ailleurs pendant qu'on travaillait, qu'on retrouve d'un
 * clic sur la cloche. Un compteur, pas un journal — le journal existe déjà.
 */
let missed = 0;
const listeners = new Set<() => void>();

function emit(): void {
    listeners.forEach((listener) => listener());
}

export function recordMissedEvent(): void {
    missed += 1;
    emit();
}

export function clearMissedEvents(): void {
    if (missed !== 0) {
        missed = 0;
        emit();
    }
}

/** Nombre d'événements passés en silence depuis la dernière consultation. */
export function useMissedEvents(): number {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);

            return () => listeners.delete(listener);
        },
        () => missed,
        () => 0,
    );
}
