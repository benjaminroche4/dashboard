<?php

declare(strict_types=1);

use App\Enums\StaffRole;
use App\Events\DashboardUpdated;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia;

beforeEach(fn () => Event::fake([DashboardUpdated::class]));

function validInvoiceInput(array $overrides = []): array
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
        'issued_at' => '2026-09-04',
        'due_at' => '2026-10-04',
        'notes' => 'Merci pour votre confiance.',
        'items' => [
            ['offer' => 'accompagne', 'quantity' => 2, 'unit_price_cents' => 15_000],
        ],
        ...$overrides,
    ];
}

test('the creation page provides company details, currencies and Swiss defaults', function (): void {
    $this->actingAs(User::factory()->manager()->create())
        ->get(route('invoices.create'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('invoices/create')
            ->has('company.name')
            ->has('company.iban')
            ->has('currencies', 2)
            ->where('currencies.0.value', 'CHF')
            ->where('currencies.1.value', 'EUR')
            ->where('defaults.currency', 'EUR')
            ->where('defaults.vat_rate', 8.1)
            ->where('defaults.issued_at', now()->toDateString())
            ->where('defaults.due_at', now()->addDays(30)->toDateString()));
});

test('members cannot open the creation page nor create invoices', function (): void {
    $member = User::factory()->role(StaffRole::Member)->create();

    $this->actingAs($member)->get(route('invoices.create'))->assertForbidden();
    $this->actingAs($member)->post(route('invoices.store'), validInvoiceInput())->assertForbidden();

    expect(Invoice::count())->toBe(0);
});

test('managers can create an invoice in euros and are sent back to the list', function (): void {
    $manager = User::factory()->manager()->create();

    $this->actingAs($manager)
        ->post(route('invoices.store'), validInvoiceInput())
        ->assertRedirect(route('invoices.index'));

    $invoice = Invoice::sole();

    expect($invoice->number)->toBe('RP-27001')
        ->and($invoice->currency->value)->toBe('EUR')
        ->and($invoice->amount_cents)->toBe(30_000)
        ->and($invoice->vat_cents)->toBe(0)
        ->and($invoice->client_city)->toBe('Genève')
        ->and($invoice->client_address)->toBe("Rue du Rhône 1\n1204 Genève\nSuisse")
        ->and($invoice->notes)->toBe('Merci pour votre confiance.')
        ->and($invoice->created_by)->toBe($manager->id)
        ->and($invoice->statusChanges()->count())->toBe(1)
        ->and($invoice->statusChanges()->first()->note)->toBe('Création');
});

test('discount and deposit are stored and reflected in the totals', function (): void {
    $this->actingAs(User::factory()->manager()->create())
        ->post(route('invoices.store'), validInvoiceInput([
            'vat_rate' => 0,
            'discount_percent' => 50,
            'deposit_cents' => 5_000,
        ]))
        ->assertRedirect(route('invoices.index'));

    $invoice = Invoice::sole();

    expect($invoice->discount_percent)->toBe(50.0)
        ->and($invoice->discount_cents)->toBe(15_000)
        ->and($invoice->amount_cents)->toBe(15_000)
        ->and($invoice->deposit_cents)->toBe(5_000)
        ->and($invoice->dueCents())->toBe(10_000);
});

test('a free line is stored with its label and no offer', function (): void {
    $this->actingAs(User::factory()->admin()->create())
        ->post(route('invoices.store'), validInvoiceInput([
            'items' => [
                ['offer' => 'confie', 'quantity' => 1, 'unit_price_cents' => 100_000],
                ['offer' => null, 'description' => 'État des lieux', 'quantity' => 2, 'unit_price_cents' => 15_000],
            ],
        ]))
        ->assertSessionHasNoErrors();

    $items = Invoice::query()->latest('id')->firstOrFail()->items;

    expect($items)->toHaveCount(2)
        ->and($items[1]['offer'])->toBeNull()
        ->and($items[1]['description'])->toBe('État des lieux')
        ->and($items[0]['description'])->toBe('Offre Confié');
});

test('a line needs an offer or a label', function (): void {
    $this->actingAs(User::factory()->admin()->create())
        ->from(route('invoices.create'))
        ->post(route('invoices.store'), validInvoiceInput([
            'items' => [['offer' => null, 'description' => '', 'quantity' => 1, 'unit_price_cents' => 100]],
        ]))
        ->assertRedirect(route('invoices.create'))
        ->assertSessionHasErrors(['items.0.offer', 'items.0.description']);

    expect(session('errors')->first('items.0.description'))->toBe('Le champ libellé est obligatoire quand offre n\'est pas présent.');
});

test('the request is validated in French', function (): void {
    $this->actingAs(User::factory()->admin()->create())
        ->from(route('invoices.create'))
        ->post(route('invoices.store'), validInvoiceInput([
            'client_name' => '',
            'currency' => 'USD',
            'due_at' => '2026-01-01',
            'items' => [['offer' => 'premium', 'quantity' => -1, 'unit_price_cents' => -1]],
        ]))
        ->assertRedirect(route('invoices.create'))
        ->assertSessionHasErrors([
            'client_name',
            'currency',
            'due_at',
            'items.0.offer',
            'items.0.quantity',
            'items.0.unit_price_cents',
        ]);

    expect(session('errors')->first('client_name'))->toBe('Le champ nom du client est obligatoire.');
});

test('at least one line is required', function (): void {
    $this->actingAs(User::factory()->admin()->create())
        ->post(route('invoices.store'), validInvoiceInput(['items' => []]))
        ->assertSessionHasErrors('items');
});
