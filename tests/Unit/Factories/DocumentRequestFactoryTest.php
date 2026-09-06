<?php

declare(strict_types=1);

use App\Enums\LeadLanguage;
use App\Models\DocumentRequest;
use App\Support\DocumentCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('the factory builds a valid request and its states apply', function (): void {
    $request = DocumentRequest::factory()->withGuarantor()->english()->create();

    expect($request->language)->toBe(LeadLanguage::English)
        ->and($request->persons)->toHaveCount(2)
        ->and($request->persons[0]['first_name'])->toBe($request->first_name)
        ->and($request->persons[1]['role'])->toBe('guarantor')
        ->and($request->persons[1]['first_name'])->not->toBe('')
        ->and(str_starts_with($request->upload_url, 'https://'))->toBeTrue();

    foreach ($request->persons as $person) {
        foreach ($person['documents'] as $key) {
            expect(DocumentCatalog::has($key))->toBeTrue();
        }
    }
});
