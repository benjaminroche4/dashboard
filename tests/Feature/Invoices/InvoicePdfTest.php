<?php

declare(strict_types=1);

use App\Models\Invoice;
use App\Models\User;
use Illuminate\Support\Facades\Http;

test('the PDF is generated through DocRaptor and downloaded', function (): void {
    config()->set('services.docraptor.key', 'test-key');
    config()->set('services.docraptor.test_mode', true);
    Http::fake(['api.docraptor.com/*' => Http::response('%PDF-1.4 fake', 200)]);

    $invoice = Invoice::factory()->create(['number' => 'F-2026-0042', 'client_name' => 'Acme SA']);

    $this->actingAs(User::factory()->create())
        ->get(route('invoices.pdf', $invoice))
        ->assertOk()
        ->assertHeader('Content-Type', 'application/pdf')
        ->assertHeader('Content-Disposition', 'attachment; filename="facture-F-2026-0042.pdf"')
        ->assertSee('%PDF-1.4 fake', false);

    Http::assertSent(function ($request): bool {
        $body = $request->data();

        return $request->url() === 'https://api.docraptor.com/docs'
            && $request->hasHeader('Authorization')
            && $body['test'] === true
            && $body['document_type'] === 'pdf'
            && str_contains((string) $body['document_content'], 'Acme SA')
            && str_contains((string) $body['document_content'], 'F-2026-0042');
    });
});

test('a missing DocRaptor key answers 503 instead of crashing', function (): void {
    config()->set('services.docraptor.key');
    $invoice = Invoice::factory()->create();

    $this->actingAs(User::factory()->create())
        ->get(route('invoices.pdf', $invoice))
        ->assertStatus(503);
});

test('guests cannot download invoices', function (): void {
    $invoice = Invoice::factory()->create();

    $this->get(route('invoices.pdf', $invoice))->assertRedirect(route('login'));
});

test('the invoice HTML renders lines and totals in the right currency', function (): void {
    $invoice = Invoice::factory()->create([
        'currency' => 'EUR',
        'items' => [['offer' => 'confie', 'description' => 'Offre Confié', 'quantity' => 2, 'unit_price_cents' => 470_000]],
        'subtotal_cents' => 940_000,
        'vat_rate' => 0,
        'vat_cents' => 0,
        'amount_cents' => 940_000,
    ]);

    $html = view('invoices.pdf', ['invoice' => $invoice, 'company' => config('company')])->render();

    expect($html)->toContain('Offre Confié')
        ->toContain('9 400,00 EUR')
        ->toContain('Relocation In Paris');
});
