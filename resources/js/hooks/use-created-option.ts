import { useEffect, useRef } from 'react';

/**
 * Sélectionne l'entrée qui vient d'apparaître dans une liste d'options : les
 * dialogues « Nouvel agent » et « Nouveau propriétaire » rechargent les props
 * de la page sans dire ce qu'ils ont créé, la nouveauté est donc l'identifiant
 * absent de la liste au moment où le dialogue a été ouvert.
 *
 * Renvoie la fonction à appeler à l'ouverture du dialogue, pour figer la liste
 * connue.
 */
export function useCreatedOption(
    items: { id: number }[],
    onCreated: (id: number) => void,
): () => void {
    const known = useRef<number[] | null>(null);

    useEffect(() => {
        if (known.current === null) {
            return;
        }

        const created = items.find((item) => !known.current!.includes(item.id));

        if (created) {
            known.current = null;
            onCreated(created.id);
        }
    }, [items, onCreated]);

    return () => {
        known.current = items.map((item) => item.id);
    };
}
