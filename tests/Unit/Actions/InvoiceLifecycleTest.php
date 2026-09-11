<?php

declare(strict_types=1);

use App\Actions\Invoices\MarkInvoicePaid;
use App\Actions\Invoices\MarkOverdueInvoices;
use App\Actions\Invoices\SendInvoice;
use App\Enums\InvoiceStatus;
use App\Events\DashboardUpdated;
use App\Mail\InvoiceSent;
use App\Models\Invoice;
use App\Models\User;
use App\Services\DocRaptor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

beforeEach(function (): void {
    Event::fake([DashboardUpdated::class]);
    Mail::fake();
});

test('sending a draft e-mails the client with the PDF and logs the transition', function (): void {
    Http::fake(['api.docraptor.com/*' => Http::response('%PDF-1.4 fake', 200)]);
    $manager = User::factory()->manager()->create();
    $invoice = Invoice::factory()->status(InvoiceStatus::Draft)->create(['client_email' => 'client@example.ch']);

    $withPdf = (new SendInvoice(new DocRaptor('key', true, 'https://api.docraptor.com/docs')))->handle($invoice, $manager);

    expect($withPdf)->toBeTrue()
        ->and($invoice->fresh()->status)->toBe(InvoiceStatus::Sent)
        ->and($invoice->fresh()->sent_at)->not->toBeNull()
        ->and($invoice->statusChanges()->count())->toBe(1)
        ->and($invoice->statusChanges()->latest('id')->first()->to_status)->toBe(InvoiceStatus::Sent);

    Mail::assertQueued(InvoiceSent::class, fn (InvoiceSent $mail): bool => $mail->hasTo('client@example.ch')
        && $mail->invoice->is($invoice)
        && count($mail->attachments()) === 1);
    Event::assertDispatched(DashboardUpdated::class, fn (DashboardUpdated $event): bool => str_contains($event->message, 'a envoyé'));
});

test('sending without DocRaptor still e-mails, without attachment', function (): void {
    $invoice = Invoice::factory()->status(InvoiceStatus::Draft)->create(['client_email' => 'client@example.ch']);

    $withPdf = (new SendInvoice(new DocRaptor(null, true, 'https://api.docraptor.com/docs')))->handle($invoice);

    expect($withPdf)->toBeFalse();
    Mail::assertQueued(InvoiceSent::class, fn (InvoiceSent $mail): bool => $mail->attachments() === []);
});

test('sending requires a client e-mail and a sendable status', function (): void {
    $sender = new SendInvoice(new DocRaptor(null, true, 'https://api.docraptor.com/docs'));

    expect(fn (): bool => $sender->handle(Invoice::factory()->status(InvoiceStatus::Draft)->create(['client_email' => null])))
        ->toThrow(ValidationException::class);
    expect(fn (): bool => $sender->handle(Invoice::factory()->paid()->create(['client_email' => 'c@example.ch'])))
        ->toThrow(ValidationException::class);
    Mail::assertNothingQueued();
});

test('a sent invoice can be marked paid with a payment date', function (): void {
    $admin = User::factory()->admin()->create();
    $invoice = Invoice::factory()->create();

    (new MarkInvoicePaid)->handle($invoice, now()->subDay(), $admin);

    expect($invoice->fresh()->status)->toBe(InvoiceStatus::Paid)
        ->and($invoice->fresh()->paid_at?->toDateString())->toBe(now()->subDay()->toDateString())
        ->and($invoice->statusChanges()->latest('id')->first()->changed_by)->toBe($admin->id);
});

test('a draft cannot be marked paid', function (): void {
    (new MarkInvoicePaid)->handle(Invoice::factory()->status(InvoiceStatus::Draft)->create(), now());
})->throws(ValidationException::class);

test('overdue detection only touches sent invoices past their due date', function (): void {
    $late = Invoice::factory()->create(['due_at' => now()->subDay()]);
    $onTime = Invoice::factory()->create(['due_at' => now()->addDay()]);
    $draftLate = Invoice::factory()->status(InvoiceStatus::Draft)->create(['due_at' => now()->subDays(3)]);

    $count = (new MarkOverdueInvoices)->handle();

    expect($count)->toBe(1)
        ->and($late->fresh()->status)->toBe(InvoiceStatus::Overdue)
        ->and($onTime->fresh()->status)->toBe(InvoiceStatus::Sent)
        ->and($draftLate->fresh()->status)->toBe(InvoiceStatus::Draft)
        ->and($late->statusChanges()->latest('id')->first()->note)->toBe('Échéance dépassée');
});
