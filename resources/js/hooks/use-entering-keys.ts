import { useEffect, useRef } from 'react';

/**
 * Clés qui viennent d'apparaître dans une liste depuis le rendu précédent —
 * une ligne arrivée par le temps réel, un enregistrement. Vide au premier
 * rendu : une liste qui se charge n'a pas à faire entrer chaque ligne.
 */
export function useEnteringKeys(keys: readonly string[]): ReadonlySet<string> {
    const known = useRef<Set<string> | null>(null);
    const entering = new Set<string>();

    if (known.current !== null) {
        for (const key of keys) {
            if (!known.current.has(key)) {
                entering.add(key);
            }
        }
    }

    useEffect(() => {
        known.current = new Set(keys);
    });

    return entering;
}
