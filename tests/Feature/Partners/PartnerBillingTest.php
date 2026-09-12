<?php

declare(strict_types=1);

use App\Enums\Offer;
use App\Events\DashboardUpdated;
use App\Models\Invoice;
use App\Models\Partner;
use App\Models\PartnerContact;
use App\Models\Quote;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

test('a quote or an invoice is created from a partner, prefilled with its details', function (): void {
    $manager = User::factory()->create(['role' => 'manager']);
    $partner = Partner::factory()->create([
        'name' => 'Zen Assurances',
        'email' => null,
        'street' => '12 rue de Turenne',
        'postal_code' => '75003',
        'city' => 'Paris',
    ]);
    // Sans e-mail sur le partenaire, celui de l'interlocuteur principal sert.
    PartnerContact::factory()->create([
        'partner_id' => $partner->id,
        'email' => 'contact@zen.fr',
        'is_primary' => true,
    ]);

    foreach ([route('invoices.create', ['partner' => $partner->uuid]), route('tools.quotes.create', ['partner' => $partner->uuid])] as $url) {
        $this->actingAs($manager)
            ->get($url)
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->where('prefill.subject.kind', 'partner')
                ->where('prefill.subject.id', $partner->id)
                ->where('prefill.subject.uuid', $partner->uuid)
                ->where('prefill.subject.name', 'Zen Assurances')
                ->where('prefill.client_name', 'Zen Assurances')
                ->where('prefill.client_email', 'contact@zen.fr')
                ->where('prefill.client_street', '12 rue de Turenne')
                ->where('prefill.client_postal_code', '75003')
                ->where('prefill.client_city', 'Paris')
                // Un partenaire n'a ni formule ni devise à lui.
                ->where('prefill.offer', null));
    }
});

test('an invoice stores the partner it is addressed to, and keeps it when edited', function (): void {
    $manager = User::factory()->create(['role' => 'manager']);
    $partner = Partner::factory()->create(['name' => 'Zen Assurances']);

    $payload = [
        'client_name' => 'Zen Assurances',
        'client_email' => 'contact@zen.fr',
        'currency' => 'EUR',
        'vat_rate' => 8.1,
        'issued_at' => now()->toDateString(),
        'due_at' => now()->addDays(30)->toDateString(),
        'partner_id' => $partner->id,
        'items' => [['offer' => Offer::Accompagne->value, 'quantity' => 1, 'unit_price_cents' => 119_000]],
    ];

    $this->actingAs($manager)->post(route('invoices.store'), $payload)->assertRedirect();

    $invoice = Invoice::query()->sole();
    expect($invoice->partner_id)->toBe($partner->id);

    // Une modification qui n'envoie pas le rattachement ne l'efface pas.
    $this->actingAs($manager)
        ->put(route('invoices.update', $invoice), [...$payload, 'partner_id' => null, 'client_name' => 'Zen Assurances SA'])
        ->assertRedirect();

    expect($invoice->refresh()->partner_id)->toBe($partner->id)
        ->and($invoice->client_name)->toBe('Zen Assurances SA');
});

test('the partner page lists the quotes and invoices addressed to it', function (): void {
    $manager = User::factory()->create(['role' => 'manager']);
    $partner = Partner::factory()->create();
    $other = Partner::factory()->create();

    $quote = Quote::factory()->create(['partner_id' => $partner->id]);
    $invoice = Invoice::factory()->create(['partner_id' => $partner->id]);
    Invoice::factory()->create(['partner_id' => $other->id]);
    Invoice::factory()->create();

    $this->actingAs($manager)
        ->get(route('partners.show', $partner))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('quotes', 1)
            ->where('quotes.0.number', $quote->number)
            ->has('invoices', 1)
            ->where('invoices.0.number', $invoice->number)
            // Managers et admins gèrent devis et factures.
            ->where('can.quotes', true)
            ->where('can.invoices', true));

    // La facture rappelle le partenaire à qui elle est adressée.
    $this->actingAs($manager)
        ->get(route('invoices.show', $invoice))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('invoice.partner.uuid', $partner->uuid)
            ->where('invoice.partner.name', $partner->name));
});

test('a member who only reads quotes and invoices is not offered to create them', function (): void {
    $member = User::factory()->create(['role' => 'member']);
    $partner = Partner::factory()->create();

    $this->actingAs($member)
        ->get(route('partners.show', $partner))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('can.quotes', false)
            ->where('can.invoices', false));
});
