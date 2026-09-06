<?php

declare(strict_types=1);

namespace App\Http\Controllers\Invoices;

use App\Actions\Invoices\CreateInvoice;
use App\Actions\Invoices\LinkInvoiceToLead;
use App\Actions\Invoices\MarkInvoicePaid;
use App\Actions\Invoices\MarkInvoicesPaid;
use App\Actions\Invoices\SendInvoice;
use App\Actions\Invoices\SendInvoices;
use App\Data\InvoiceData;
use App\Enums\Currency;
use App\Enums\InvoiceStatus;
use App\Enums\Offer;
use App\Http\Controllers\Controller;
use App\Http\Requests\Invoices\BulkPayInvoicesRequest;
use App\Http\Requests\Invoices\BulkSendInvoicesRequest;
use App\Http\Requests\Invoices\LinkInvoiceLeadRequest;
use App\Http\Requests\Invoices\PayInvoiceRequest;
use App\Http\Requests\Invoices\StoreInvoiceRequest;
use App\Models\Invoice;
use App\Models\InvoiceStatusChange;
use App\Models\Lead;
use App\Services\DocRaptor;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
            ->with('lead')
            ->latest('issued_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (Invoice $invoice): array => [
                'id' => $invoice->id,
                'number' => $invoice->number,
                'client_name' => $invoice->client_name,
                'client_email' => $invoice->client_email,
                'lead' => $this->leadSummary($invoice),
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

    public function create(Request $request): Response
    {
        $this->authorize('create', Invoice::class);

        // ?lead=ID : facture créée depuis la fiche d'un lead, client prérempli et facture rattachée.
        $lead = $request->filled('lead') ? Lead::query()->find((int) $request->query('lead')) : null;

        return Inertia::render('invoices/create', [
            'prefill' => $lead === null ? null : [
                'lead_id' => $lead->id,
                'lead_name' => $lead->fullName(),
                'client_name' => $lead->company !== null && $lead->company !== '' ? $lead->company : $lead->fullName(),
                'client_email' => $lead->email ?? '',
                'currency' => $lead->currency->value,
                'offer' => $lead->offer?->value,
            ],
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

    /** Rattache (ou détache avec lead_id null) la facture à un lead. */
    public function link(LinkInvoiceLeadRequest $request, Invoice $invoice, LinkInvoiceToLead $linkInvoiceToLead): RedirectResponse
    {
        $this->authorize('update', $invoice);

        $leadId = $request->validated('lead_id');
        $lead = $leadId === null ? null : Lead::query()->findOrFail((int) $leadId);
        $linkInvoiceToLead->handle($invoice, $lead, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => $lead === null
            ? __('Facture :number détachée du lead.', ['number' => $invoice->number])
            : __('Facture :number rattachée à :name.', ['number' => $invoice->number, 'name' => $lead->fullName()])]);

        return back();
    }

    /** Recherche de factures par numéro ou client (JSON), pour rattacher depuis une fiche lead. */
    public function search(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Invoice::class);

        $query = trim((string) $request->query('q', ''));

        if ($query === '') {
            return response()->json([]);
        }

        $invoices = Invoice::query()
            ->with('lead')
            ->where(function ($builder) use ($query): void {
                $builder->where('number', 'like', "%{$query}%")
                    ->orWhere('client_name', 'like', "%{$query}%")
                    ->orWhere('client_email', 'like', "%{$query}%");
            })
            ->latest('issued_at')
            ->orderByDesc('id')
            ->limit(10)
            ->get()
            ->map(fn (Invoice $invoice): array => [
                'id' => $invoice->id,
                'number' => $invoice->number,
                'client_name' => $invoice->client_name,
                'amount_cents' => $invoice->amount_cents,
                'currency' => $invoice->currency->value,
                'status_label' => $invoice->status->label(),
                'lead' => $this->leadSummary($invoice),
            ])
            ->all();

        return response()->json($invoices);
    }

    /**
     * @return array{id: int, name: string}|null
     */
    private function leadSummary(Invoice $invoice): ?array
    {
        return $invoice->lead === null ? null : ['id' => $invoice->lead->id, 'name' => $invoice->lead->fullName()];
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

        $invoice->load(['statusChanges.author', 'creator', 'lead']);

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
                'created_by_avatar' => $invoice->creator?->avatar,
                'lead' => $this->leadSummary($invoice),
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

    public function bulkSend(BulkSendInvoicesRequest $request, SendInvoices $sendInvoices): RedirectResponse
    {
        $result = $sendInvoices->handle(Invoice::query()->whereIn('id', $request->ids())->get(), $request->user());

        Inertia::flash('toast', $this->bulkToast($result['sent'], $result['skipped'], __(':count facture(s) envoyée(s).', ['count' => count($result['sent'])]), __('Aucune facture envoyée : les factures cochées ne sont pas envoyables (statut ou e-mail manquant).')));

        return back();
    }

    public function bulkPay(BulkPayInvoicesRequest $request, MarkInvoicesPaid $markPaid): RedirectResponse
    {
        /** @var string $paidAt */
        $paidAt = $request->validated('paid_at');
        $result = $markPaid->handle(Invoice::query()->whereIn('id', $request->ids())->get(), Date::parse($paidAt), $request->user());

        Inertia::flash('toast', $this->bulkToast($result['paid'], $result['skipped'], __(':count facture(s) marquée(s) payée(s).', ['count' => count($result['paid'])]), __('Aucune facture marquée payée : les factures cochées ne sont pas payables.')));

        return back();
    }

    /**
     * Toast d'une action groupée : succès, avertissement partiel ou échec total.
     *
     * @param  list<string>  $done
     * @param  list<string>  $skipped
     * @return array{type: string, message: string}
     */
    private function bulkToast(array $done, array $skipped, string $success, string $nothing): array
    {
        if ($done === []) {
            return ['type' => 'warning', 'message' => $nothing];
        }

        if ($skipped === []) {
            return ['type' => 'success', 'message' => $success];
        }

        return ['type' => 'warning', 'message' => $success.' '.__('Ignorée(s) : :numbers.', ['numbers' => implode(', ', $skipped)])];
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
