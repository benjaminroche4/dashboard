import { describe, expect, it } from 'vitest';
import { paginationRange } from '@/lib/pagination';

describe('paginationRange', () => {
    it('lists every page while they fit', () => {
        expect(paginationRange(1, 1)).toEqual([1]);
        expect(paginationRange(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('keeps the first and last pages around the current one', () => {
        expect(paginationRange(10, 372)).toEqual([
            1,
            'gap',
            9,
            10,
            11,
            'gap',
            372,
        ]);
        expect(paginationRange(2, 372)).toEqual([1, 2, 3, 'gap', 372]);
        expect(paginationRange(371, 372)).toEqual([1, 'gap', 370, 371, 372]);
    });

    it('clamps a page out of bounds', () => {
        expect(paginationRange(0, 20)).toEqual([1, 2, 'gap', 20]);
        expect(paginationRange(99, 20)).toEqual([1, 'gap', 19, 20]);
    });
});
