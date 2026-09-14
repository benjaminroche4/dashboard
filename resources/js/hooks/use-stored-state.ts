import { useCallback, useState, type SetStateAction } from 'react';

/** Espace de noms commun : une clé effacée ou renommée n'écrase rien d'autre. */
const PREFIX = 'dashboard.';

/** Lit une valeur mémorisée, ou `fallback` si elle manque ou ne se lit pas. */
export function readStored<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(PREFIX + key);

        return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
        return fallback;
    }
}

function writeStored<T>(key: string, value: T): void {
    try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
        // Stockage indisponible (navigation privée, quota) : la valeur reste en mémoire.
    }
}

/**
 * Un `useState` qui survit au rechargement de la page : la valeur est relue
 * depuis `localStorage` au montage et réécrite à chaque changement. Sans clé,
 * c'est un `useState` ordinaire — utile quand un composant est parfois
 * affiché hors de tout contexte à mémoriser.
 *
 * Réservé aux préférences d'affichage (colonnes masquées, filtres cochés,
 * vue choisie) : ce qui appartient aux données passe par le serveur.
 */
export function useStoredState<T>(
    key: string | undefined,
    initial: T,
): [T, (value: SetStateAction<T>) => void] {
    const [value, setValue] = useState<T>(() =>
        key === undefined ? initial : readStored(key, initial),
    );

    const set = useCallback(
        (next: SetStateAction<T>) => {
            setValue((current) => {
                const resolved =
                    typeof next === 'function'
                        ? (next as (previous: T) => T)(current)
                        : next;

                if (key !== undefined) {
                    writeStored(key, resolved);
                }

                return resolved;
            });
        },
        [key],
    );

    return [value, set];
}
