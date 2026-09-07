import { useEffect, useState } from 'react';

/** Heure courante, rafraîchie à intervalle régulier (chaque seconde pour un chrono). */
export function useNow(intervalMs = 1_000): Date {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), intervalMs);

        return () => window.clearInterval(id);
    }, [intervalMs]);

    return now;
}
