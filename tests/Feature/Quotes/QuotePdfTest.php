<?php

declare(strict_types=1);

use App\Models\Quote;
use App\Models\User;
use Illuminate\Support\Facades\Http;

test('the PDF is generated through DocRaptor and downloaded', function (): void {
    config()->set('services.docraptor.key', 'test-key');
    config()->set('services.docraptor.test_mode', true);
    Http::fake(['api.docraptor.com/*' => Http::response('%PDF-1.4 fake', 200)]);

    $quote = Quote::factory()->create(['number' => 'DV-27042', 'client_name' => 'Acme SA']);

    $this->actingAs(User::factory()->create())
        ->get(route('tools.quotes.pdf', $quote))
        ->assertOk()
        ->assertHeader('Content-Type', 'application/pdf')
        ->assertHeader('Content-Disposition', 'attachment; filename="devis-DV-27042.pdf"')
        ->assertSee('%PDF-1.4 fake', false);

    Http::assertSent(fn ($request): bool => str_contains((string) $request->data()['document_content'], 'Acme SA')
        && str_contains((string) $request->data()['document_content'], 'DV-27042'));
});

test('a missing DocRaptor key answers 503 and guests are redirected', function (): void {
    config()->set('services.docraptor.key');
    $quote = Quote::factory()->create();

    $this->get(route('tools.quotes.pdf', $quote))->assertRedirect(route('login'));
    $this->actingAs(User::factory()->create())->get(route('tools.quotes.pdf', $quote))->assertStatus(503);
});

test('the quote HTML renders the validity, lines and totals in the right currency', function (): void {
    $quote = Quote::factory()->create([
        'currency' => 'EUR',
        'items' => [['offer' => 'confie', 'description' => 'Offre Confié', 'quantity' => 2, 'unit_price_cents' => 470_000]],
        'subtotal_cents' => 940_000,
        'vat_rate' => 0,
        'vat_cents' => 0,
        'amount_cents' => 940_000,
        'valid_until' => '2026-10-07',
    ]);

    $html = view('quotes.pdf', ['quote' => $quote, 'company' => config('company')])->render();

    expect($html)->toContain('<h1>Devis</h1>')
        ->toContain('Adressé à')
        ->toContain('Offre Confié')
        ->toContain('9 400,00 EUR')
        ->toContain('7 octobre 2026')
        ->toContain('Bon pour accord')
        ->not->toContain('Acompte');
});
