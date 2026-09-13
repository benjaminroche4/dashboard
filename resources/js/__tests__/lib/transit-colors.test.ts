import { describe, expect, it } from 'vitest';
import { transitLineColors } from '@/lib/transit';

describe('transitLineColors', () => {
    it('gives each metro line the colour of the network', () => {
        expect(transitLineColors('metro', '1').background).toBe('#FFCE00');
        expect(transitLineColors('metro', '7').background).toBe('#F3A4BA');
        expect(transitLineColors('metro', '14').background).toBe('#662483');
        // Les antennes s'écrivent « 3bis », « 7bis ».
        expect(transitLineColors('metro', '3bis').background).toBe('#98D4E2');
    });

    it('knows the RER letters, whatever the case', () => {
        expect(transitLineColors('rer', 'a').background).toBe('#E2231A');
        expect(transitLineColors('rer', 'E').background).toBe('#C04191');
    });

    it('writes in black on a light line, in white on a dark one', () => {
        // Jaune de la 1 : le blanc y serait illisible.
        expect(transitLineColors('metro', '1').text).toBe('#000000');
        expect(transitLineColors('metro', '14').text).toBe('#FFFFFF');
    });

    it('keeps one livery for the buses, which have no colour per line', () => {
        expect(transitLineColors('bus', '21')).toEqual(
            transitLineColors('bus', '95'),
        );
        expect(transitLineColors('bus', '21').text).toBe('#FFFFFF');
    });

    it('falls back on the neutral livery for a line it does not know', () => {
        expect(transitLineColors('metro', '42').background).toBe(
            transitLineColors('bus', '42').background,
        );
    });
});
