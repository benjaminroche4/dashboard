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
        'client_address' => "Rue du Rhône 1\n1204 Genève",
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
            ->where('defaults.currency', 'CHF')
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

    expect($invoice->number)->toBe('F-2026-0001')
        ->and($invoice->currency->value)->toBe('EUR')
        ->and($invoice->amount_cents)->toBe(30_000)
        ->and($invoice->vat_cents)->toBe(0)
        ->and($invoice->notes)->toBe('Merci pour votre confiance.')
        ->and($invoice->created_by)->toBe($manager->id);
});

test('the request is validated in French', function (): void {
    $this->actingAs(User::factory()->admin()->create())
        ->from(route('invoices.create'))
        ->post(route('invoices.store'), validInvoiceInput([
            'client_name' => '',
            'currency' => 'USD',
            'due_at' => '2026-01-01',
            'items' => [['offer' => 'premium', 'quantity' => 0, 'unit_price_cents' => -1]],
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
