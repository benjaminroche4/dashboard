/**
 * Fonctions proposées pour un agent immobilier. Miroir de l'enum PHP
 * `App\Enums\AgentPosition` (valeur stockée, libellé affiché).
 */
export const agentPositions = [
    { value: 'negotiator', label: 'Négociateur' },
    { value: 'advisor', label: 'Conseiller immobilier' },
    { value: 'agency_director', label: 'Directeur d’agence' },
    { value: 'rental_manager', label: 'Gestionnaire locatif' },
    { value: 'property_manager', label: 'Property manager' },
    { value: 'assistant', label: 'Assistant commercial' },
    { value: 'independent', label: 'Agent indépendant' },
    { value: 'other', label: 'Autre' },
] as const;

export type AgentPositionValue = (typeof agentPositions)[number]['value'];
