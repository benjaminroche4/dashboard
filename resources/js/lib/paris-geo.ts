import { arrondissementOutlines } from '@/lib/paris-arrondissements-geo';

/**
 * Centre approximatif d'un arrondissement (moyenne des sommets du contour),
 * miroir de `App\Support\ParisArrondissements::centroid()`.
 */
export function arrondissementCentroid(
    district: number,
): { lat: number; lng: number } | null {
    const outline = arrondissementOutlines[district];

    if (!outline || outline.length === 0) {
        return null;
    }

    const sum = outline.reduce(
        (acc, [lng, lat]) => ({ lat: acc.lat + lat, lng: acc.lng + lng }),
        { lat: 0, lng: 0 },
    );

    return {
        lat: Math.round((sum.lat / outline.length) * 1e5) / 1e5,
        lng: Math.round((sum.lng / outline.length) * 1e5) / 1e5,
    };
}

/**
 * Position d'un bien sur la carte : géocodée si elle existe, sinon le centre
 * de son arrondissement (`approximate`), sinon null.
 */
export function propertyPosition(property: {
    latitude: number | null;
    longitude: number | null;
    district: number | null;
}): { lat: number; lng: number; approximate: boolean } | null {
    if (property.latitude !== null && property.longitude !== null) {
        return {
            lat: property.latitude,
            lng: property.longitude,
            approximate: false,
        };
    }

    const centroid =
        property.district === null
            ? null
            : arrondissementCentroid(property.district);

    return centroid ? { ...centroid, approximate: true } : null;
}
