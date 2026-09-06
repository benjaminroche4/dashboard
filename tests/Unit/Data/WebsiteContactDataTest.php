<?php

declare(strict_types=1);

use App\Data\WebsiteContactData;
use App\Enums\LeadLanguage;
use App\Enums\Offer;
use App\Enums\WebsiteHelpType;

test('it capitalizes names, maps enums and turns blanks into null', function (): void {
    $data = WebsiteContactData::from([
        'reference' => 'CT-123456',
        'first_name' => 'marie-claire',
        'last_name' => "d'ARC",
        'email' => '',
        'phone' => '+33612345678',
        'company' => ' ',
        'help_type' => 'rental_management',
        'offer' => '',
        'message' => null,
        'lang' => 'en',
        'created_at' => '2026-09-06T10:00:00+02:00',
    ]);

    expect($data->firstName)->toBe('Marie-Claire')
        ->and($data->lastName)->toBe("D'Arc")
        ->and($data->email)->toBeNull()
        ->and($data->company)->toBeNull()
        ->and($data->helpType)->toBe(WebsiteHelpType::RentalManagement)
        ->and($data->offer)->toBeNull()
        ->and($data->language)->toBe(LeadLanguage::English)
        ->and($data->createdAt?->toIso8601String())->toBe('2026-09-06T10:00:00+02:00')
        ->and($data->toArray()['reference'])->toBe('CT-123456');
});

test('it falls back to French and keeps a chosen offer', function (): void {
    $data = WebsiteContactData::from(['reference' => 'CT-1', 'first_name' => 'a', 'last_name' => 'b', 'help_type' => 'housing_search', 'offer' => 'confie']);

    expect($data->language)->toBe(LeadLanguage::French)
        ->and($data->offer)->toBe(Offer::Confie)
        ->and($data->createdAt)->toBeNull();
});
