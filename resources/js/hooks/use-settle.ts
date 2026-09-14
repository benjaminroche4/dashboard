import { useEffect, useRef, useState } from 'react';

/** Durée pendant laquelle l'élément « se pose » (miroir de `--animate-settle`). */
export const SETTLE_MS = 600;

/**
 * Vrai pendant un court instant après que `value` a changé — jamais au
 * premier rendu. À poser sur l'élément qui doit signaler son changement :
 * `className={cn(settling && 'animate-settle motion-reduce:animate-none')}`.
 */
export function useSettle(value: unknown, duration = SETTLE_MS): boolean {
    const previous = useRef(value);
    const [settling, setSettling] = useState(false);

    useEffect(() => {
        if (Object.is(previous.current, value)) {
            return;
        }

        previous.current = value;
        setSettling(true);
        const timer = window.setTimeout(() => setSettling(false), duration);

        return () => window.clearTimeout(timer);
    }, [value, duration]);

    return settling;
}
