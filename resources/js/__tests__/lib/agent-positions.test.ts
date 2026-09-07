import { describe, expect, it } from 'vitest';
import { agentPositions } from '@/lib/agent-positions';

describe('agentPositions', () => {
    it('mirrors the PHP enum App\\Enums\\AgentPosition', () => {
        expect(
            Object.fromEntries(agentPositions.map((p) => [p.value, p.label])),
        ).toEqual({
            negotiator: 'Négociateur',
            advisor: 'Conseiller immobilier',
            agency_director: 'Directeur d’agence',
            rental_manager: 'Gestionnaire locatif',
            property_manager: 'Property manager',
            assistant: 'Assistant commercial',
            independent: 'Agent indépendant',
            other: 'Autre',
        });
    });
});
