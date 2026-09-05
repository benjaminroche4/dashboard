import { describe, expect, it } from 'vitest';
import {
    describeDistricts,
    districtPosition,
    ordinal,
    parisDistricts,
} from '@/lib/paris-districts';
import { joinPhone, splitPhone } from '@/components/phone-input';

describe('paris districts', () => {
    it('describes a selection', () => {
        expect(describeDistricts([])).toBeNull();
        expect(describeDistricts([11, 1, 4])).toBe('1er, 4e, 11e');
        expect(describeDistricts([1, 2, 3, 4, 5, 6])).toBe('6 arrondissements');
        expect(
            describeDistricts(
                parisDistricts.map((district) => district.number),
            ),
        ).toBe('Tout Paris');
        expect(ordinal(20)).toBe('20e');
    });

    it('places every district inside the map', () => {
        for (const district of parisDistricts) {
            const { left, top } = districtPosition(district);
            expect(left).toBeGreaterThan(0);
            expect(left).toBeLessThan(100);
            expect(top).toBeGreaterThan(0);
            expect(top).toBeLessThan(100);
        }
    });
});

describe('phone with dial code', () => {
    it('splits and joins numbers', () => {
        expect(splitPhone('+41 79 000 00 00')).toEqual({
            code: '+41',
            number: '79 000 00 00',
        });
        expect(splitPhone('+1 555 0100')).toEqual({
            code: '+1',
            number: '555 0100',
        });
        expect(splitPhone('06 12')).toEqual({ code: '+33', number: '06 12' });
        expect(joinPhone('+33', '  ')).toBe('');
        expect(joinPhone('+33', '6 12')).toBe('+33 6 12');
    });
});
