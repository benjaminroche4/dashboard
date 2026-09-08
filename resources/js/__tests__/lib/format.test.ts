import { describe, expect, it } from 'vitest';
import {
    capitalizeName,
    formatDate,
    formatFileSize,
    formatMoney,
} from '@/lib/format';

describe('format helpers', () => {
    it('formats cents as French euros', () => {
        expect(formatMoney(125_000).replace(/ | /g, ' ')).toBe('1 250,00 €');
    });

    it('formats ISO dates in short French', () => {
        expect(formatDate('2026-09-04')).toBe('04 sept. 2026');
    });

    it('capitalises names like the PHP helper', () => {
        expect(capitalizeName('BENJAMIN ROCHE')).toBe('Benjamin Roche');
        expect(capitalizeName("jean-pierre d'arc")).toBe("Jean-Pierre D'Arc");
        expect(capitalizeName('  de la  tour ')).toBe('De La Tour');
        expect(capitalizeName('éléonore')).toBe('Éléonore');
    });
});

describe('formatFileSize', () => {
    it('reads bytes, kilobytes and megabytes in French', () => {
        expect(formatFileSize(512)).toBe('512 o');
        expect(formatFileSize(245_000)).toBe('239 Ko');
        expect(formatFileSize(1_300_000)).toBe('1,2 Mo');
    });
});
