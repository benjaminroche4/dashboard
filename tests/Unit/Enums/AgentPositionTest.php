<?php

declare(strict_types=1);

use App\Enums\AgentPosition;

test('parse accepts values, labels and aliases regardless of case, and keeps unknown text as Other', function (): void {
    expect(AgentPosition::parse('negotiator'))->toBe(AgentPosition::Negotiator)
        ->and(AgentPosition::parse('Négociatrice'))->toBe(AgentPosition::Negotiator)
        ->and(AgentPosition::parse("directrice d'agence"))->toBe(AgentPosition::AgencyDirector)
        ->and(AgentPosition::parse('GESTIONNAIRE LOCATIF'))->toBe(AgentPosition::RentalManager)
        ->and(AgentPosition::parse('Mandataire'))->toBe(AgentPosition::Independent)
        ->and(AgentPosition::parse('Chef de vente'))->toBe(AgentPosition::Other)
        ->and(AgentPosition::parse('  '))->toBeNull()
        ->and(AgentPosition::parse(null))->toBeNull();
});

test('options mirror the front list', function (): void {
    expect(array_column(AgentPosition::options(), 'label', 'value'))->toBe([
        'negotiator' => 'Négociateur',
        'advisor' => 'Conseiller immobilier',
        'agency_director' => 'Directeur d’agence',
        'rental_manager' => 'Gestionnaire locatif',
        'property_manager' => 'Property manager',
        'assistant' => 'Assistant commercial',
        'independent' => 'Agent indépendant',
        'other' => 'Autre',
    ]);
});
