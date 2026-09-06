/**
 * Chargement à la demande de l'API Google Maps JavaScript, une seule fois par
 * page. En mode asynchrone, Google prévient par un `callback` global une fois
 * les classes disponibles : c'est lui qui résout la promesse, pas `onload`.
 */
const CALLBACK = '__dashboardGoogleMapsReady';

type MapsWindow = Record<typeof CALLBACK, (() => void) | undefined>;

/** Fenêtre vue comme porteuse du callback global de Google. */
const mapsWindow = (): MapsWindow => window as unknown as MapsWindow;

let loading: Promise<typeof google.maps> | null = null;

export function loadGoogleMaps(key: string): Promise<typeof google.maps> {
    if (typeof google !== 'undefined' && google.maps?.Map) {
        return Promise.resolve(google.maps);
    }

    loading ??= new Promise<typeof google.maps>((resolve, reject) => {
        const script = document.createElement('script');
        const params = new URLSearchParams({
            key,
            v: 'weekly',
            language: 'fr',
            region: 'FR',
            libraries: 'marker',
            loading: 'async',
            callback: CALLBACK,
        });

        mapsWindow()[CALLBACK] = () => {
            delete mapsWindow()[CALLBACK];
            resolve(google.maps);
        };

        script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
        script.async = true;
        script.onerror = () => {
            loading = null;
            delete mapsWindow()[CALLBACK];
            reject(new Error('Google Maps n’a pas pu être chargé.'));
        };
        document.head.appendChild(script);
    });

    return loading;
}
