<?php

declare(strict_types=1);

use App\Enums\LeadLanguage;
use App\Enums\LeadSource;
use App\Enums\LeadStatus;
use App\Enums\Offer;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use Illuminate\Support\Facades\Event;

const RIP_SECRET = 'secret-de-test';

/**
 * @param  array<string, mixed>  $payload
 * @return array<string, string>
 */
function ripHeaders(array $payload, string $secret = RIP_SECRET): array
{
    return [
        'X-Signature' => 'sha256='.hash_hmac('sha256', json_encode($payload, JSON_THROW_ON_ERROR), $secret),
    ];
}

/**
 * @return array<string, mixed>
 */
function ripContact(): array
{
    return [
        'reference' => 'CT-082820',
        'first_name' => 'john',
        'last_name' => 'DOE',
        'email' => 'john.doe@example.com',
        'phone' => '+33612345678',
        'company' => 'Acme Inc.',
        'help_type' => 'housing_search',
        'offer' => 'accompagne',
        'message' => 'I would like a 2-bedroom apartment.',
        'lang' => 'en',
        'created_at' => '2026-09-06T10:00:00+02:00',
    ];
}

beforeEach(function (): void {
    config()->set('services.rip.webhook_secret', RIP_SECRET);
    Event::fake([DashboardUpdated::class]);
});

test('a signed contact from the website becomes a lead at the top of « À traiter » and is broadcast', function (): void {
    $payload = ripContact();

    $this->postJson(route('webhooks.rip.contact'), $payload, ripHeaders($payload))
        ->assertCreated()
        ->assertJsonPath('created', true)
        ->assertJsonPath('reference', fn (string $reference): bool => str_starts_with($reference, 'LD-'));

    $lead = Lead::query()->sole();

    expect($lead->external_reference)->toBe('CT-082820')
        ->and($lead->first_name)->toBe('John')
        ->and($lead->last_name)->toBe('Doe')
        ->and($lead->email)->toBe('john.doe@example.com')
        ->and($lead->phone)->toBe('+33612345678')
        ->and($lead->company)->toBe('Acme Inc.')
        ->and($lead->offer)->toBe(Offer::Accompagne)
        ->and($lead->language)->toBe(LeadLanguage::English)
        ->and($lead->source)->toBe(LeadSource::Website)
        ->and($lead->source_note)->toBe('Formulaire de contact · Recherche de logement · CT-082820')
        ->and($lead->message)->toBe('I would like a 2-bedroom apartment.')
        ->and($lead->status)->toBe(LeadStatus::Todo)
        ->and($lead->created_by)->toBeNull();

    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => $event->resource === 'leads'
        && $event->message === 'Nouveau lead depuis le site : John Doe'
        && $event->actor === null);
});

test('the same website reference is never imported twice', function (): void {
    $payload = ripContact();

    $this->postJson(route('webhooks.rip.contact'), $payload, ripHeaders($payload))->assertCreated();
    $this->postJson(route('webhooks.rip.contact'), $payload, ripHeaders($payload))
        ->assertOk()
        ->assertJsonPath('created', false);

    expect(Lead::query()->count())->toBe(1);
    Event::assertDispatchedTimes(DashboardUpdated::class, 1);
});

test('a wrong or missing signature is rejected', function (): void {
    $payload = ripContact();

    $this->postJson(route('webhooks.rip.contact'), $payload, ripHeaders($payload, 'autre-secret'))->assertUnauthorized();
    $this->postJson(route('webhooks.rip.contact'), $payload)->assertUnauthorized();

    expect(Lead::query()->count())->toBe(0);
});

test('the webhook is closed when no secret is configured', function (): void {
    config()->set('services.rip.webhook_secret');
    $payload = ripContact();

    $this->postJson(route('webhooks.rip.contact'), $payload, ripHeaders($payload))->assertServiceUnavailable();
});

test('a contact without e-mail nor phone, or with an unknown help type, is refused with JSON errors', function (): void {
    $payload = [...ripContact(), 'email' => '', 'phone' => ''];
    $this->postJson(route('webhooks.rip.contact'), $payload, ripHeaders($payload))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email', 'phone']);

    $payload = [...ripContact(), 'help_type' => 'contact.contactForm.helpType.choice.1'];
    $this->postJson(route('webhooks.rip.contact'), $payload, ripHeaders($payload))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['help_type']);

    expect(Lead::query()->count())->toBe(0);
});

test('the webhook does not need a CSRF token nor a session', function (): void {
    $payload = ripContact();

    $this->withMiddleware()
        ->postJson(route('webhooks.rip.contact'), $payload, ripHeaders($payload))
        ->assertCreated();
});

test('a business request without offer is imported in French by default', function (): void {
    $payload = [...ripContact(), 'reference' => 'CT-000001', 'help_type' => 'business', 'offer' => null, 'lang' => null, 'email' => null];

    $this->postJson(route('webhooks.rip.contact'), $payload, ripHeaders($payload))->assertCreated();

    $lead = Lead::query()->sole();

    expect($lead->offer)->toBeNull()
        ->and($lead->language)->toBe(LeadLanguage::French)
        ->and($lead->source_note)->toBe('Formulaire de contact · Solutions pour entreprises · CT-000001');
});
