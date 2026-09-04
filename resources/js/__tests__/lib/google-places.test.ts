import { describe, expect, it } from 'vitest';
import { parseAddressComponents } from '@/lib/google-places';

const component = (types: string[], longText: string, shortText = longText) =>
    ({
        types,
        longText,
        shortText,
    }) as unknown as google.maps.places.AddressComponent;

describe('parseAddressComponents', () => {
    it('rebuilds street, postal code, city and country from Google components', () => {
        const address = parseAddressComponents([
            component(['street_number'], '5'),
            component(['route'], 'Rue des Alpes'),
            component(['locality', 'political'], 'Genève'),
            component(['postal_code'], '1201'),
            component(['country', 'political'], 'Suisse', 'CH'),
        ]);

        expect(address).toEqual({
            street: '5 Rue des Alpes',
            postalCode: '1201',
            city: 'Genève',
            countryCode: 'CH',
            countryName: 'Suisse',
        });
    });

    it('tolerates missing pieces', () => {
        expect(parseAddressComponents(null)).toEqual({
            street: '',
            postalCode: '',
            city: '',
            countryCode: null,
            countryName: '',
        });
    });
});
