<?php

declare(strict_types=1);

use App\Enums\Offer;
use App\Enums\QuoteStatus;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\Quote;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

function validQuoteInput(array $overrides = []): array
{
    return [
        'client_name' => 'Acme SA',
        'client_email' => 'compta@acme.ch',
        'client_street' => 'Rue du Rhône 1',
        'client_postal_code' => '1204',
        'client_city' => 'Genève',
        'client_country' => 'Suisse',
        'currency' => 'EUR',
        'vat_rate' => 0,
        'issued_at' => '2026-09-07',
        'valid_until' => '2026-10-07',
        'notes' => 'Offre valable un mois.',
        'items' => [
            ['offer' => 'accompagne', 'quantity' => 2, 'unit_price_cents' => 15_000],
        ],
        ...$overrides,
    ];
}

test('the creation page provides company details, offers, the next number and the defaults', function (): void {
    $this->actingAs(User::factory()->manager()->create())
        ->get(route('tools.quotes.create'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('quotes/create')
            ->has('company.name')
            ->has('offers', 2)
            ->has('currencies', 2)
            ->where('nextNumber', 'DV-27001')
            ->where('prefill', null)
            ->where('defaults.currency', 'EUR')
            ->where('defaults.vat_rate', 8.1)
            ->where('defaults.issued_at', now()->toDateString())
            ->where('defaults.valid_until', now()->addDays(30)->toDateString()));
});

test('members cannot open the creation page nor create quotes', function (): void {
    $member = User::factory()->create();

    $this->actingAs($member)->get(route('tools.quotes.create'))->assertForbidden();
    $this->actingAs($member)->post(route('tools.quotes.store'), validQuoteInput())->assertForbidden();

    expect(Quote::count())->toBe(0);
});

test('managers create a draft quote and land on its page', function (): void {
    $manager = User::factory()->manager()->create();

    $response = $this->actingAs($manager)->post(route('tools.quotes.store'), validQuoteInput(['discount_percent' => 50]));

    $quote = Quote::sole();
    $response->assertRedirect(route('tools.quotes.show', $quote));

    expect($quote->number)->toBe('DV-27001')
        ->and($quote->status)->toBe(QuoteStatus::Draft)
        ->and($quote->amount_cents)->toBe(15_000)
        ->and($quote->discount_cents)->toBe(15_000)
        ->and($quote->client_address)->toBe("Rue du Rhône 1\n1204 Genève\nSuisse")
        ->and($quote->valid_until->toDateString())->toBe('2026-10-07')
        ->and($quote->created_by)->toBe($manager->id)
        ->and($quote->statusChanges()->count())->toBe(1);
});

test('the request is validated in French, a line needs an offer or a label', function (): void {
    $this->actingAs(User::factory()->admin()->create())
        ->from(route('tools.quotes.create'))
        ->post(route('tools.quotes.store'), validQuoteInput([
            'client_name' => '',
            'valid_until' => '2026-01-01',
            'items' => [['offer' => null, 'description' => '', 'quantity' => -1, 'unit_price_cents' => 100]],
        ]))
        ->assertRedirect(route('tools.quotes.create'))
        ->assertSessionHasErrors(['client_name', 'valid_until', 'items.0.offer', 'items.0.description', 'items.0.quantity']);

    expect(session('errors')->first('client_name'))->toBe('Le champ nom du client est obligatoire.')
        ->and(session('errors')->first('valid_until'))->toContain('date de validité');

    $this->actingAs(User::factory()->admin()->create())
        ->post(route('tools.quotes.store'), validQuoteInput(['items' => []]))
        ->assertSessionHasErrors('items');
});

test('creating a quote from a lead prefills the client and links it, and the lead page lists it', function (): void {
    $manager = User::factory()->manager()->create();
    $lead = Lead::factory()->create(['first_name' => 'Léa', 'last_name' => 'Durand', 'email' => 'lea@example.com', 'company' => 'Nestlé', 'offer' => Offer::Confie]);

    $this->actingAs($manager)->get(route('tools.quotes.create', ['lead' => $lead->uuid]))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('prefill.subject.kind', 'lead')
            ->where('prefill.subject.id', $lead->id)
            ->where('prefill.subject.uuid', $lead->uuid)
            ->where('prefill.subject.name', 'Léa Durand')
            ->where('prefill.client_name', 'Nestlé')
            ->where('prefill.client_email', 'lea@example.com')
            ->where('prefill.offer', 'confie'));

    $this->actingAs($manager)->post(route('tools.quotes.store'), validQuoteInput(['lead_id' => $lead->id]))->assertSessionHasNoErrors();

    $quote = Quote::sole();
    expect($quote->lead_id)->toBe($lead->id);

    $this->actingAs($manager)->get(route('leads.show', $lead))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('quotes', 1)
            ->where('quotes.0.number', 'DV-27001')
            ->where('quotes.0.status_label', 'Brouillon'));
    $this->actingAs($manager)->get(route('tools.quotes.index'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('quotes.0.lead.name', 'Léa Durand'));
});
