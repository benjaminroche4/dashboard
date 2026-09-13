<?php

declare(strict_types=1);

use App\Mail\InvoiceSent;
use App\Mail\QuoteSent;
use App\Models\Invoice;
use App\Models\Quote;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\SendQueuedMailable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

/** Un vrai PDF : des octets bruts, que JSON refuse tels quels. */
function pdfBytes(): string
{
    return "%PDF-1.7\n".random_bytes(256)."\n%%EOF";
}

/**
 * Met le mailable dans la file **comme le fait Laravel** (payload encodé en
 * JSON), puis relit la pièce jointe du job enregistré.
 */
function queuedAttachment(Mailable $mail): string
{
    Queue::connection('database')->push(new SendQueuedMailable($mail));

    $payload = json_decode((string) DB::table('jobs')->value('payload'), true, flags: JSON_THROW_ON_ERROR);
    $job = unserialize($payload['data']['command']);
    $attachment = $job->mailable->attachments()[0];

    return (string) $attachment->attachWith(
        fn (): string => '',
        fn (Closure $data): string => $data(),
    );
}

test('an invoice PDF survives the queue payload and comes back byte for byte', function (): void {
    $pdf = pdfBytes();
    $invoice = Invoice::factory()->create(['number' => 'RP-27042']);

    expect(queuedAttachment(new InvoiceSent($invoice, $pdf)))->toBe($pdf);
});

test('a quote PDF survives the queue payload and comes back byte for byte', function (): void {
    $pdf = pdfBytes();
    $quote = Quote::factory()->create(['number' => 'DV-27042']);

    expect(queuedAttachment(new QuoteSent($quote, $pdf)))->toBe($pdf);
});
