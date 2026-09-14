import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useEnteringKeys } from '@/hooks/use-entering-keys';

describe('useEnteringKeys', () => {
    it('names only the keys that were not there at the previous render', () => {
        const { result, rerender } = renderHook(
            ({ keys }) => useEnteringKeys(keys),
            { initialProps: { keys: ['a', 'b'] } },
        );

        // Une liste qui se charge ne fait pas entrer chaque ligne.
        expect(result.current.size).toBe(0);

        rerender({ keys: ['a', 'b', 'c'] });
        expect([...result.current]).toEqual(['c']);

        // Au rendu suivant, « c » est connue : plus rien n'entre.
        rerender({ keys: ['a', 'b', 'c'] });
        expect(result.current.size).toBe(0);
    });
});
