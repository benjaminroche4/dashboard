import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn', () => {
    it('merges class names', () => {
        expect(cn('a', 'b')).toBe('a b');
    });

    it('ignores falsy values', () => {
        expect(cn('a', false, undefined, null, 'b')).toBe('a b');
    });

    it('resolves conflicting tailwind classes, last one wins', () => {
        expect(cn('p-2', 'p-4')).toBe('p-4');
    });
});
