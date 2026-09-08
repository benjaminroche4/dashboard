import type { Auth, StaffDirectoryEntry } from '@/types/auth';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            staff: StaffDirectoryEntry[];
            features: {
                addressAutocomplete: boolean;
                /** Assistant IA configuré (clé serveur présente). */
                assistant: boolean;
                /** Clé navigateur Google Maps, null sans carte réelle. */
                googleMapsKey: string | null;
            };
            /** Compteurs affichés dans le menu. */
            counts: { leadsTodo: number; ownerLeadsTodo: number };
            sidebarOpen: boolean;
            /** Props à recharger sur un événement temps réel (vide = toute la page). */
            realtimeOnly?: string[];
            [key: string]: unknown;
        };
    }
}
