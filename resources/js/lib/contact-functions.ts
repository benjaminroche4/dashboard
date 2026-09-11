/**
 * Fonctions proposées pour un interlocuteur de partenaire. Miroir de l'enum
 * PHP `App\Enums\ContactFunction` (valeur stockée, libellé affiché).
 */
export const contactFunctions = [
    { value: 'sales', label: 'Commercial' },
    { value: 'account_manager', label: 'Chargé de clientèle' },
    { value: 'advisor', label: 'Conseiller' },
    { value: 'manager', label: 'Gestionnaire' },
    { value: 'director', label: 'Directeur' },
    { value: 'broker', label: 'Courtier' },
    { value: 'technician', label: 'Technicien' },
    { value: 'assistant', label: 'Assistant' },
    { value: 'accounting', label: 'Comptabilité' },
    { value: 'other', label: 'Autre' },
] as const;

export type ContactFunctionValue = (typeof contactFunctions)[number]['value'];
