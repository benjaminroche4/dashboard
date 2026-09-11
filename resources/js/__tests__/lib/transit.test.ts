import { describe, expect, it } from 'vitest';
import { transitLabel } from '@/lib/transit';

describe('transitLabel', () => {
    it('reads a stop the way it is announced to a client', () => {
        expect(
            transitLabel({
                kind: 'metro',
                name: 'Oberkampf',
                lines: ['2', '9'],
                minutes: 4,
            }),
        ).toBe('Métro Oberkampf · 2, 9 · 4 min à pied');
    });

    it('leaves out what is unknown', () => {
        expect(
            transitLabel({
                kind: 'bus',
                name: 'Saint-Maur',
                lines: [],
                minutes: null,
            }),
        ).toBe('Bus Saint-Maur');
        expect(
            transitLabel({
                kind: 'rer',
                name: 'Nation',
                lines: ['A'],
                minutes: null,
            }),
        ).toBe('RER Nation · A');
    });
});
