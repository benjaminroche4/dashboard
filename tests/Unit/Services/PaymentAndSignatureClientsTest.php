<?php

declare(strict_types=1);

use App\Enums\LeadLanguage;
use App\Enums\Offer;
use App\Enums\PaymentPlan;
use App\Mail\LeadDossierSent;
use App\Models\Lead;
use App\Services\DistrictStaticMap;
use App\Services\PaymentLinks;
use App\Services\Yousign;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

test('PaymentLinks picks the link for the offer, the plan and the language', function (): void {
    $links = PaymentLinks::fromConfig();

    expect($links->isConfigured())->toBeTrue()
        ->and($links->for(Offer::Confie, PaymentPlan::Full, LeadLanguage::French))->toBe('https://payment.relocation-in-paris.fr/b/4gMaEZ9h1dKrcCr7zy7EQ0N')
        ->and($links->for(Offer::Confie, PaymentPlan::Full, LeadLanguage::English))->toBe('https://payment.relocation-in-paris.fr/b/28EbJ3dxhbCjfODcTS7EQ0M')
        ->and($links->for(Offer::Confie, PaymentPlan::Deposit, LeadLanguage::French))->toBe('https://payment.relocation-in-paris.fr/b/aFa14p9h15dVfOD9HG7EQ0x')
        ->and($links->for(Offer::Confie, PaymentPlan::Deposit, LeadLanguage::English))->toBe('https://payment.relocation-in-paris.fr/b/6oU00ldxhfSzauj3ji7EQ0u')
        ->and($links->for(Offer::Accompagne, PaymentPlan::Full, LeadLanguage::French))->toBe('https://payment.relocation-in-paris.fr/b/dRm28teBlbCjgSH0767EQ0E')
        ->and($links->for(Offer::Accompagne, PaymentPlan::Full, LeadLanguage::English))->toBe('https://payment.relocation-in-paris.fr/b/6oU9AVbp96hZbyn1ba7EQ0F')
        ->and($links->for(Offer::Accompagne, PaymentPlan::Deposit, LeadLanguage::French))->toBeNull()
        ->and($links->plansFor(Offer::Confie))->toBe([PaymentPlan::Full, PaymentPlan::Deposit])
        ->and($links->plansFor(Offer::Accompagne))->toBe([PaymentPlan::Full])
        ->and((new PaymentLinks([]))->isConfigured())->toBeFalse();
});

test('Yousign uploads the contract, adds the signer and returns the signing link', function (): void {
    Http::fake([
        'api-sandbox.yousign.app/v3/signature_requests' => Http::response(['id' => 'sr_1']),
        'api-sandbox.yousign.app/v3/signature_requests/sr_1/documents' => Http::response(['id' => 'doc_1']),
        'api-sandbox.yousign.app/v3/signature_requests/sr_1/signers' => Http::response(['id' => 'sig_1']),
        'api-sandbox.yousign.app/v3/signature_requests/sr_1/activate' => Http::response(['signers' => [['id' => 'sig_1', 'signature_link' => 'https://yousign.app/sign/abc']]]),
    ]);
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'email' => 'lea@example.com']);

    $url = (new Yousign('ys_test', 'https://api-sandbox.yousign.app/v3'))->signatureLink($lead, '%PDF-1.4', 'Contrat');

    expect($url)->toBe('https://yousign.app/sign/abc');
    Http::assertSentCount(4);
    Http::assertSent(fn ($request): bool => str_ends_with($request->url(), '/documents') && $request->hasFile('file'));
    Http::assertSent(fn ($request): bool => str_ends_with($request->url(), '/signers')
        && $request['info']['first_name'] === 'Léa'
        && $request['fields'][0]['document_id'] === 'doc_1');
});

test('Yousign fails loudly when a step is refused', function (): void {
    Http::fake(['api-sandbox.yousign.app/v3/signature_requests' => Http::response(['detail' => 'unauthorized'], 401)]);
    $lead = Lead::factory()->create(['email' => 'lea@example.com']);

    expect(fn (): string => (new Yousign('bad', 'https://api-sandbox.yousign.app/v3'))->signatureLink($lead, '%PDF', 'Contrat'))
        ->toThrow(RuntimeException::class, '401');
});

test('DistrictStaticMap draws the requested districts and needs a key', function (): void {
    $url = (new DistrictStaticMap('server-key', 'map-style'))->build([3, 11], 'en');

    expect($url)->toStartWith('https://maps.googleapis.com/maps/api/staticmap?')
        ->toContain('size=560x260')->toContain('language=en')->toContain('map_id=map-style')->toContain('key=server-key')
        ->and(substr_count((string) $url, '&path='))->toBe(2)
        ->and($url)->toContain(rawurlencode('fillcolor:0x71172e35|color:0x71172eCC|weight:2|enc:'));
    expect((new DistrictStaticMap('server-key', null))->build([], 'fr'))->toBeNull()
        ->and((new DistrictStaticMap('server-key', null))->build([99], 'fr'))->toBeNull()
        ->and((new DistrictStaticMap(null, null))->build([3], 'fr'))->toBeNull()
        ->and((new DistrictStaticMap('k', null))->build([3], 'fr'))->not->toContain('map_id');
});

test('the move-in wording stays fuzzy: as soon as possible, early, mid or late month', function (): void {
    $now = now();
    expect(LeadDossierSent::moveInLabel(null, 'fr'))->toBe('le plus tôt possible')
        ->and(LeadDossierSent::moveInLabel($now->copy()->addDays(10), 'en'))->toBe('as soon as possible')
        ->and(LeadDossierSent::moveInLabel($now->copy()->addMonths(3)->day(5), 'fr'))->toStartWith('début ')
        ->and(LeadDossierSent::moveInLabel($now->copy()->addMonths(3)->day(15), 'en'))->toStartWith('mid-')
        ->and(LeadDossierSent::moveInLabel($now->copy()->addMonths(3)->day(25), 'fr'))->toStartWith('fin ');
});
