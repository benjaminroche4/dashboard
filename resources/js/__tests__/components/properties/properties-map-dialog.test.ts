import { describe, expect, it } from 'vitest';
import { bubble } from '@/components/properties/properties-map-dialog';
import type { MapPoint } from '@/components/properties/properties-map-dialog';

const point: MapPoint = {
    uuid: '0199a9a0-0000-7000-8000-0000000000b1',
    label: 'T2 lumineux · 11e',
    street: '12, rue Oberkampf',
    postal_code: '75011',
    city: 'Paris',
    district: 11,
    latitude: 48.86,
    longitude: 2.37,
    status: 'available',
    status_label: 'Disponible',
    is_available: true,
    assigned_to: null,
    rent_cents: 150_000,
    currency: 'EUR',
};

describe('bubble', () => {
    it('holds the name, the address, the rent and the status', () => {
        const html = bubble(point);

        expect(html).toContain('T2 lumineux · 11e');
        expect(html).toContain('12, rue Oberkampf, 75011 Paris');
        expect(html).toContain('Disponible');
        expect(html).toContain(`/${point.uuid}`);
    });

    it('keeps the text inside the card: bounded width and words that wrap', () => {
        const html = bubble({
            ...point,
            label: 'Appartement-témoin-avec-un-nom-interminable-qui-ne-tient-pas',
            street: 'boulevard-de-la-tres-longue-avenue-sans-espace',
        });

        expect(html).toContain('width:16rem');
        expect(html).toContain('max-width:100%');
        expect(html).toContain('overflow-wrap:anywhere');
    });

    it('escapes what comes from the directory', () => {
        expect(
            bubble({ ...point, label: '<script>alert("x")</script>' }),
        ).toContain('&lt;script&gt;');
    });

    it('says nothing about an unassigned property, and names the client otherwise', () => {
        expect(bubble(point)).not.toContain('Attribué à');
        expect(bubble({ ...point, assigned_to: 'Bruno & Charles' })).toContain(
            'Attribué à Bruno &amp; Charles',
        );
    });

    it('says so when the rent is unknown', () => {
        expect(bubble({ ...point, rent_cents: null })).toContain(
            'Loyer non renseigné',
        );
    });
});
