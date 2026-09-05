/**
 * Les vingt arrondissements de Paris, avec le centre approximatif de chacun,
 * pour les placer sur la carte schématique du formulaire.
 */
export type District = { number: number; lat: number; lng: number };

export const parisDistricts: District[] = [
    { number: 1, lat: 48.8625, lng: 2.3364 },
    { number: 2, lat: 48.8683, lng: 2.3427 },
    { number: 3, lat: 48.863, lng: 2.36 },
    { number: 4, lat: 48.8543, lng: 2.3576 },
    { number: 5, lat: 48.8445, lng: 2.3507 },
    { number: 6, lat: 48.849, lng: 2.3327 },
    { number: 7, lat: 48.8562, lng: 2.3121 },
    { number: 8, lat: 48.8727, lng: 2.3125 },
    { number: 9, lat: 48.877, lng: 2.3373 },
    { number: 10, lat: 48.8761, lng: 2.361 },
    { number: 11, lat: 48.859, lng: 2.3796 },
    { number: 12, lat: 48.835, lng: 2.421 },
    { number: 13, lat: 48.8283, lng: 2.3624 },
    { number: 14, lat: 48.8293, lng: 2.3265 },
    { number: 15, lat: 48.8401, lng: 2.2929 },
    { number: 16, lat: 48.8604, lng: 2.262 },
    { number: 17, lat: 48.8873, lng: 2.3068 },
    { number: 18, lat: 48.8925, lng: 2.3479 },
    { number: 19, lat: 48.8871, lng: 2.3846 },
    { number: 20, lat: 48.8634, lng: 2.4012 },
];

const bounds = {
    minLat: 48.816,
    maxLat: 48.903,
    minLng: 2.245,
    maxLng: 2.435,
};

/** Position en pourcentage dans un conteneur, depuis les coordonnées GPS. */
export function districtPosition(district: District): {
    left: number;
    top: number;
} {
    return {
        left:
            ((district.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) *
            100,
        top:
            ((bounds.maxLat - district.lat) / (bounds.maxLat - bounds.minLat)) *
            100,
    };
}

export function ordinal(number: number): string {
    return number === 1 ? '1er' : `${number}e`;
}

/** « Tout Paris », « 3e, 4e, 11e » ou « 6 arrondissements » au-delà de cinq. */
export function describeDistricts(districts: number[]): string | null {
    if (districts.length === 0) {
        return null;
    }

    if (districts.length === 20) {
        return 'Tout Paris';
    }

    const sorted = [...districts].sort((a, b) => a - b);

    return sorted.length > 5
        ? `${sorted.length} arrondissements`
        : sorted.map(ordinal).join(', ');
}
