<?php

declare(strict_types=1);

namespace App\Http\Controllers\Invoices;

use App\Actions\Invoices\CreateInvoice;
use App\Actions\Invoices\MarkInvoicePaid;
use App\Actions\Invoices\SendInvoice;
use App\Data\InvoiceData;
use App\Enums\Currency;
use App\Enums\InvoiceStatus;
use App\Enums\Offer;
use App\Http\Controllers\Controller;
use App\Http\Requests\Invoices\PayInvoiceRequest;
use App\Http\Requests\Invoices\StoreInvoiceRequest;
use App\Models\Invoice;
use App\Models\InvoiceStatusChange;
use App\Services\DocRaptor;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Date;
use Inertia\Inertia;
use Inertia\Response;

class InvoiceController extends Controller
{
    use AuthorizesRequests;

    public function index(): Response
    {
        $this->authorize('viewAny', Invoice::class);

        $invoices = Invoice::query()
            ->latest('issued_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (Invoice $invoice): array => [
                'id' => $invoice->id,
                'number' => $invoice->number,
                'client_name' => $invoice->client_name,
                'client_email' => $invoice->client_email,
                'amount_cents' => $invoice->amount_cents,
                'deposit_cents' => $invoice->deposit_cents,
                'due_cents' => $invoice->dueCents(),
                'currency' => $invoice->currency->value,
                'status' => $invoice->status->value,
                'status_label' => $invoice->status->label(),
                'issued_at' => $invoice->issued_at->toDateString(),
                'due_at' => $invoice->due_at->toDateString(),
                'paid_at' => $invoice->paid_at?->toDateString(),
                'can_send' => $invoice->status->canTransitionTo(InvoiceStatus::Sent) && $invoice->client_email !== null,
                'can_pay' => $invoice->status->canTransitionTo(InvoiceStatus::Paid),
            ])
            ->all();

        return Inertia::render('invoices/index', [
            'invoices' => $invoices,
            'statuses' => collect(InvoiceStatus::cases())
                ->map(fn (InvoiceStatus $status): array => ['value' => $status->value, 'label' => $status->label()])
                ->all(),
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Invoice::class);

        return Inertia::render('invoices/create', [
            'company' => config('company'),
            'offers' => collect(Offer::cases())
                ->map(fn (Offer $offer): array => [
                    'value' => $offer->value,
                    'label' => $offer->label(),
                    'description' => $offer->description(),
                    'prices' => collect(Currency::cases())
                        ->mapWithKeys(fn (Currency $currency): array => [$currency->value => $offer->defaultPriceCents($currency)])
                        ->all(),
                ])
                ->all(),
            'currencies' => collect(Currency::cases())
                ->map(fn (Currency $currency): array => ['value' => $currency->value, 'label' => $currency->label()])
                ->all(),
            'vatRates' => config('company.vat_rates'),
            'countries' => config('company.countries'),
            'nextNumber' => CreateInvoice::nextNumber(),
            'defaults' => [
                'currency' => config('company.default_currency'),
                'vat_rate' => config('company.default_vat_rate'),
                'issued_at' => now()->toDateString(),
                'due_at' => now()->addDays((int) config('company.default_payment_terms_days'))->toDateString(),
            ],
        ]);
    }

    public function store(StoreInvoiceRequest $request, CreateInvoice $createInvoice): RedirectResponse
    {
        $invoice = $createInvoice->handle(InvoiceData::from($request->validated()), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Facture :number créée.', ['number' => $invoice->number])]);

        return to_route('invoices.index');
    }

    public function pdf(Invoice $invoice): HttpResponse
    {
        $this->authorize('view', $invoice);

        $docRaptor = DocRaptor::fromConfig();

        abort_unless($docRaptor->isConfigured(), 503, __('La génération de PDF n\'est pas configurée.'));

        $html = view('invoices.pdf', [
            'invoice' => $invoice,
            'company' => config('company'),
            'logo' => SendInvoice::logoDataUri(),
        ])->render();

        $pdf = $docRaptor->pdf($html, "facture-{$invoice->number}.pdf");

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="facture-'.$invoice->number.'.pdf"',
        ]);
    }

    public function show(Invoice $invoice): Response
    {
        $this->authorize('view', $invoice);

        $invoice->load(['statusChanges.author', 'creator']);

        return Inertia::render('invoices/show', [
            'invoice' => [
                'id' => $invoice->id,
                'number' => $invoice->number,
                'client_name' => $invoice->client_name,
                'client_email' => $invoice->client_email,
                'client_street' => $invoice->client_street,
                'client_postal_code' => $invoice->client_postal_code,
                'client_city' => $invoice->client_city,
                'client_country' => $invoice->client_country,
                'items' => $invoice->items ?? [],
                'vat_rate' => $invoice->vat_rate,
                'discount_percent' => $invoice->discount_percent,
                'discount_cents' => $invoice->discount_cents,
                'subtotal_cents' => $invoice->subtotal_cents,
                'vat_cents' => $invoice->vat_cents,
                'amount_cents' => $invoice->amount_cents,
                'deposit_cents' => $invoice->deposit_cents,
                'due_cents' => $invoice->dueCents(),
                'currency' => $invoice->currency->value,
                'status' => $invoice->status->value,
                'status_label' => $invoice->status->label(),
                'issued_at' => $invoice->issued_at->toDateString(),
                'due_at' => $invoice->due_at->toDateString(),
                'sent_at' => $invoice->sent_at?->toIso8601String(),
                'paid_at' => $invoice->paid_at?->toDateString(),
                'notes' => $invoice->notes,
                'created_by' => $invoice->creator?->name,
                'can_send' => $invoice->status->canTransitionTo(InvoiceStatus::Sent) && $invoice->client_email !== null,
                'can_pay' => $invoice->status->canTransitionTo(InvoiceStatus::Paid),
            ],
            'history' => $invoice->statusChanges->map(fn (InvoiceStatusChange $change): array => [
                'id' => $change->id,
                'from' => $change->from_status?->label(),
                'to' => $change->to_status->label(),
                'to_status' => $change->to_status->value,
                'by' => $change->author?->name,
                'note' => $change->note,
                'at' => $change->created_at->toIso8601String(),
            ])->all(),
            'company' => config('company'),
            'offers' => collect(Offer::cases())
                ->map(fn (Offer $offer): array => ['value' => $offer->value, 'label' => $offer->label(), 'description' => $offer->description()])
                ->all(),
        ]);
    }

    public function send(Invoice $invoice, SendInvoice $sendInvoice): RedirectResponse
    {
        $this->authorize('update', $invoice);

        $withPdf = $sendInvoice->handle($invoice, auth()->user());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $withPdf
                ? __('Facture :number envoyée avec le PDF à :email.', ['number' => $invoice->number, 'email' => $invoice->client_email])
                : __('Facture :number envoyée à :email (sans PDF, DocRaptor non configuré).', ['number' => $invoice->number, 'email' => $invoice->client_email]),
        ]);

        return back();
    }

    public function pay(PayInvoiceRequest $request, Invoice $invoice, MarkInvoicePaid $markPaid): RedirectResponse
    {
        /** @var array{paid_at: string} $validated */
        $validated = $request->validated();

        $markPaid->handle($invoice, Date::parse($validated['paid_at']), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Facture :number marquée payée.', ['number' => $invoice->number])]);

        return back();
    }
}
