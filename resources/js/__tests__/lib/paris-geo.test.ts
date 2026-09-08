import { describe, expect, it } from 'vitest';
import { arrondissementCentroid, propertyPosition } from '@/lib/paris-geo';

describe('paris geo helpers', () => {
    it('computes a centroid inside Paris for each arrondissement, none otherwise', () => {
        for (let district = 1; district <= 20; district++) {
            const centroid = arrondissementCentroid(district);
            expect(centroid).not.toBeNull();
            expect(centroid!.lat).toBeGreaterThan(48.81);
            expect(centroid!.lat).toBeLessThan(48.91);
            expect(centroid!.lng).toBeGreaterThan(2.22);
            expect(centroid!.lng).toBeLessThan(2.48);
        }
        expect(arrondissementCentroid(21)).toBeNull();
    });

    it('prefers geocoded coordinates, falls back to the arrondissement, else null', () => {
        expect(
            propertyPosition({
                latitude: 48.8656,
                longitude: 2.3705,
                district: 11,
            }),
        ).toEqual({ lat: 48.8656, lng: 2.3705, approximate: false });
        expect(
            propertyPosition({ latitude: null, longitude: null, district: 11 }),
        ).toMatchObject({
            approximate: true,
        });
        expect(
            propertyPosition({
                latitude: null,
                longitude: null,
                district: null,
            }),
        ).toBeNull();
    });
});
