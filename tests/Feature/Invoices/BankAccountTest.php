<?php

declare(strict_types=1);

use App\Enums\Currency;
use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Models\Quote;
use App\Models\User;
use App\Support\BankAccounts;
use Inertia\Testing\AssertableInertia;

test('the accounts of a currency come first, then those serving every currency', function (): void {
    config(['company.accounts' => [
        ['label' => 'Compte suisse', 'bank' => 'BCGE', 'iban' => 'CH11', 'currency' => 'CHF'],
        ['label' => 'Compte français', 'bank' => 'Qonto', 'iban' => 'FR22', 'currency' => 'EUR'],
        ['label' => 'Compte pivot', 'bank' => 'Wise', 'iban' => 'BE33', 'currency' => null],
    ]]);

    expect(array_column(BankAccounts::forCurrency(Currency::EUR), 'iban'))->toBe(['FR22', 'BE33'])
        ->and(array_column(BankAccounts::forCurrency(Currency::CHF), 'iban'))->toBe(['CH11', 'BE33'])
        ->and(BankAccounts::default(Currency::EUR)['iban'])->toBe('FR22');
});

test('without any configured account, the historical one stands alone', function (): void {
    config(['company.accounts' => null, 'company.bank' => 'Banque Exemple SA', 'company.iban' => 'CH00']);

    expect(BankAccounts::all())->toHaveCount(1)
        ->and(BankAccounts::default(Currency::EUR)['iban'])->toBe('CH00');
});

test('an account without an IBAN is not an account', function (): void {
    // Une option vide ferait planter le sélecteur du formulaire.
    config(['company.accounts' => [
        ['label' => 'Vide', 'bank' => 'Banque', 'iban' => '  '],
        ['label' => 'Compte français', 'bank' => 'Qonto', 'iban' => 'FR22', 'currency' => 'EUR'],
    ]]);

    expect(array_column(BankAccounts::all(), 'iban'))->toBe(['FR22']);

    // Sans IBAN nulle part, la société n'a simplement aucun compte.
    config(['company.accounts' => null, 'company.iban' => '']);

    expect(BankAccounts::all())->toBe([])
        ->and(BankAccounts::default(Currency::EUR))->toBeNull()
        ->and(BankAccounts::resolve(null, null, null, Currency::EUR))->toBe(['bank' => '', 'iban' => '', 'reference' => '']);
});

test('an invoice keeps the account it was issued with, and falls back to the default of its currency', function (): void {
    config(['company.accounts' => [
        ['label' => 'Compte français', 'bank' => 'Qonto', 'iban' => 'FR22', 'currency' => 'EUR'],
    ]]);

    $chosen = Invoice::factory()->create(['currency' => Currency::EUR, 'bank_name' => 'BCGE', 'bank_iban' => 'CH11']);
    $default = Invoice::factory()->create(['currency' => Currency::EUR, 'bank_name' => null, 'bank_iban' => null]);

    expect($chosen->bankAccount())->toBe(['bank' => 'BCGE', 'iban' => 'CH11', 'reference' => ''])
        ->and($default->bankAccount())->toBe(['bank' => 'Qonto', 'iban' => 'FR22', 'reference' => '']);

    // Le compte figé survit à un changement de configuration.
    config(['company.accounts' => [['label' => 'Autre', 'bank' => 'Revolut', 'iban' => 'LT44', 'currency' => 'EUR']]]);
    expect($chosen->bankAccount()['iban'])->toBe('CH11')
        ->and($default->bankAccount()['iban'])->toBe('LT44');
});

test('the invoice form receives the accounts and stores the chosen one', function (): void {
    config(['company.accounts' => [
        ['label' => 'Compte français', 'bank' => 'Qonto', 'iban' => 'FR22', 'currency' => 'EUR'],
        ['label' => 'Compte suisse', 'bank' => 'BCGE', 'iban' => 'CH11', 'currency' => 'CHF'],
    ]]);
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->get(route('invoices.create'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('bankAccounts', 2)
            ->where('bankAccounts.0.iban', 'FR22'));

    $this->actingAs($admin)
        ->post(route('invoices.store'), [
            'client_name' => 'Léa Durand',
            'currency' => 'CHF',
            'vat_rate' => 8.1,
            'issued_at' => '2026-09-01',
            'due_at' => '2026-09-30',
            'bank_name' => 'BCGE',
            'bank_iban' => 'CH11',
            'items' => [['offer' => 'accompagne', 'quantity' => 1, 'unit_price_cents' => 100_000]],
        ])
        ->assertSessionHasNoErrors();

    $invoice = Invoice::query()->where('client_name', 'Léa Durand')->sole();
    expect($invoice->bank_iban)->toBe('CH11')
        ->and($invoice->status)->toBe(InvoiceStatus::Draft);

    // Le PDF imprime ce compte, pas celui de la configuration.
    expect(view('invoices.pdf', ['invoice' => $invoice, 'company' => config('company')])->render())
        ->toContain('CH11');
});

test('a quote carries its own account too', function (): void {
    config(['company.accounts' => [['label' => 'Compte français', 'bank' => 'Qonto', 'iban' => 'FR22', 'currency' => 'EUR']]]);

    $quote = Quote::factory()->create(['currency' => Currency::EUR, 'bank_name' => 'Revolut', 'bank_iban' => 'LT44']);

    expect($quote->bankAccount())->toBe(['bank' => 'Revolut', 'iban' => 'LT44', 'reference' => '']);
});

test('the reference to quote on the transfer travels with the account', function (): void {
    config(['company.accounts' => [
        ['label' => 'Compte français', 'bank' => 'Qonto', 'iban' => 'FR22', 'reference' => 'RIP-FR', 'currency' => 'EUR'],
    ]]);
    $admin = User::factory()->admin()->create();

    // La configuration expose la référence du compte au formulaire.
    $this->actingAs($admin)
        ->get(route('invoices.create'))
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->where('bankAccounts.0.reference', 'RIP-FR'));

    $this->actingAs($admin)
        ->post(route('invoices.store'), [
            'client_name' => 'Léa Durand',
            'currency' => 'EUR',
            'vat_rate' => 8.1,
            'issued_at' => '2026-09-01',
            'due_at' => '2026-09-30',
            'bank_name' => 'Revolut',
            'bank_iban' => 'LT44',
            'bank_reference' => 'RIP-2026-04',
            'items' => [['offer' => 'accompagne', 'quantity' => 1, 'unit_price_cents' => 100_000]],
        ])
        ->assertSessionHasNoErrors();

    $invoice = Invoice::query()->where('client_name', 'Léa Durand')->sole();

    expect($invoice->bank_reference)->toBe('RIP-2026-04')
        ->and($invoice->bankAccount()['reference'])->toBe('RIP-2026-04');

    // Elle est imprimée sur le PDF, sous les coordonnées du compte.
    expect(view('invoices.pdf', ['invoice' => $invoice, 'company' => config('company')])->render())
        ->toContain('Référence à indiquer : RIP-2026-04');

    // Sans référence sur le document, c'est celle du compte par défaut.
    $default = Invoice::factory()->create(['currency' => Currency::EUR, 'bank_name' => null, 'bank_iban' => null, 'bank_reference' => null]);

    expect($default->bankAccount()['reference'])->toBe('RIP-FR');
});
