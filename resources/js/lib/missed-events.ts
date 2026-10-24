import { useSyncExternalStore } from 'react';

/**
 * Événements temps réel reçus **sans toast** depuis la dernière consultation :
 * ce qui a changé ailleurs pendant qu'on travaillait, qu'on retrouve d'un
 * clic sur la cloche. Un compteur, pas un journal — le journal existe déjà.
 * Il survit au rechargement de la page (`sessionStorage`) : ce qu'on n'a pas
 * vu reste à voir tant que l'onglet est ouvert.
 */
const STORAGE_KEY = 'dashboard.missed-events';

function readStored(): number {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        const value = raw === null ? 0 : Number.parseInt(raw, 10);

        return Number.isFinite(value) && value > 0 ? value : 0;
    } catch {
        return 0;
    }
}

function writeStored(value: number): void {
    try {
        if (value === 0) {
            sessionStorage.removeItem(STORAGE_KEY);
        } else {
            sessionStorage.setItem(STORAGE_KEY, String(value));
        }
    } catch {
        // Stockage indisponible : le compteur reste en mémoire.
    }
}

let missed = readStored();
const listeners = new Set<() => void>();

function emit(): void {
    writeStored(missed);
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
