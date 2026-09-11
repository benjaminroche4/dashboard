<?php

declare(strict_types=1);

namespace App\Http\Controllers\Quotes;

use App\Actions\Quotes\AcceptQuote;
use App\Actions\Quotes\AcceptQuotes;
use App\Actions\Quotes\ConvertQuoteToInvoice;
use App\Actions\Quotes\CreateQuote;
use App\Actions\Quotes\DeclineQuote;
use App\Actions\Quotes\LinkQuoteToLead;
use App\Actions\Quotes\RenderQuotePdf;
use App\Actions\Quotes\SendQuote;
use App\Actions\Quotes\SendQuotes;
use App\Actions\Quotes\UpdateQuote;
use App\Data\QuoteData;
use App\Enums\Currency;
use App\Enums\Offer;
use App\Enums\QuoteStatus;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Leads\LeadController;
use App\Http\Requests\Quotes\BulkQuotesRequest;
use App\Http\Requests\Quotes\DeclineQuoteRequest;
use App\Http\Requests\Quotes\LinkQuoteLeadRequest;
use App\Http\Requests\Quotes\StoreQuoteRequest;
use App\Http\Requests\Quotes\UpdateQuoteRequest;
use App\Models\Lead;
use App\Models\Quote;
use App\Models\QuoteStatusChange;
use App\Services\DocRaptor;
use App\Support\BankAccounts;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class QuoteController extends Controller
{
    use AuthorizesRequests;

    public function index(): Response
    {
        $this->authorize('viewAny', Quote::class);

        $quotes = Quote::query()
            ->with('lead')
            ->latest('issued_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (Quote $quote): array => $this->summary($quote))
            ->all();

        return Inertia::render('quotes/index', [
            'quotes' => $quotes,
            'statuses' => collect(QuoteStatus::cases())
                ->map(fn (QuoteStatus $status): array => ['value' => $status->value, 'label' => $status->label()])
                ->all(),
        ]);
    }

    /** Recherche ⌘K : numéro DV-… ou nom du client, huit résultats au plus. */
    public function search(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Quote::class);

        $query = trim((string) $request->query('q', ''));

        if (mb_strlen($query) < 2) {
            return response()->json([]);
        }

        return response()->json(Quote::query()
            ->where(function ($builder) use ($query): void {
                $builder->where('number', 'like', "%{$query}%")
                    ->orWhere('client_name', 'like', "%{$query}%");
            })
            ->latest('issued_at')
            ->orderByDesc('id')
            ->limit(8)
            ->get()
            ->map(fn (Quote $quote): array => [
                'id' => $quote->id,
                'uuid' => $quote->uuid,
                'title' => $quote->number,
                'subtitle' => $quote->client_name.' · '.$this->money($quote->amount_cents, $quote->currency).' · '.$quote->status->label(),
                'url' => route('tools.quotes.show', $quote),
            ])
            ->all());
    }

    private function money(int $cents, Currency $currency): string
    {
        return number_format($cents / 100, 2, ',', ' ').' '.($currency === Currency::EUR ? '€' : $currency->value);
    }

    public function create(Request $request): Response
    {
        $this->authorize('create', Quote::class);

        // ?lead=UUID : devis créé depuis la fiche d'un lead, client prérempli et devis rattaché.
        $lead = $request->filled('lead') ? Lead::query()->where('uuid', (string) $request->query('lead'))->first() : null;

        return Inertia::render('quotes/create', [
            ...$this->formOptions(),
            'nextNumber' => CreateQuote::nextNumber(),
            'prefill' => $lead === null ? null : [
                'lead_id' => $lead->id,
                'lead_uuid' => $lead->uuid,
                'lead_name' => $lead->fullName(),
                // La société d'abord ; sinon le foyer (« Bruno & Charles » à deux locataires).
                'client_name' => $lead->company !== null && $lead->company !== '' ? $lead->company : $lead->householdName(),
                'client_email' => $lead->email ?? '',
                'currency' => $lead->currency->value,
                'offer' => $lead->offer?->value,
            ],
        ]);
    }

    /**
     * Options du formulaire, partagées par la création et la modification.
     *
     * @return array<string, mixed>
     */
    private function formOptions(): array
    {
        return [
            'company' => config('company'),
            'bankAccounts' => BankAccounts::all(),
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
            'defaults' => [
                'currency' => config('company.default_currency'),
                'vat_rate' => config('company.default_vat_rate'),
                'issued_at' => now()->toDateString(),
                'valid_until' => now()->addDays((int) config('company.default_quote_validity_days'))->toDateString(),
            ],
        ];
    }

    /** Modification d'un devis encore en jeu : la page de création, préremplie. */
    public function edit(Quote $quote): Response
    {
        $this->authorize('update', $quote);

        abort_unless(UpdateQuote::isEditable($quote), 403, __('Ce devis ne peut plus être modifié.'));

        $quote->load('lead');

        return Inertia::render('quotes/create', [
            ...$this->formOptions(),
            'nextNumber' => $quote->number,
            'quote' => [
                'id' => $quote->id,
                'uuid' => $quote->uuid,
                'number' => $quote->number,
                'client_name' => $quote->client_name,
                'client_email' => $quote->client_email,
                'client_street' => $quote->client_street,
                'client_postal_code' => $quote->client_postal_code,
                'client_city' => $quote->client_city,
                'client_country' => $quote->client_country,
                'items' => $quote->items ?? [],
                'vat_rate' => $quote->vat_rate,
                'discount_percent' => $quote->discount_percent,
                'currency' => $quote->currency->value,
                'issued_at' => $quote->issued_at->toDateString(),
                'valid_until' => $quote->valid_until->toDateString(),
                'notes' => $quote->notes,
                'bank_name' => $quote->bank_name,
                'bank_iban' => $quote->bank_iban,
                'lead' => LeadController::linkSummary($quote->lead),
            ],
        ]);
    }

    public function update(UpdateQuoteRequest $request, Quote $quote, UpdateQuote $updateQuote): RedirectResponse
    {
        $updateQuote->handle($quote, QuoteData::from($request->validated()), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Devis :number mis à jour.', ['number' => $quote->number])]);

        return to_route('tools.quotes.show', $quote);
    }

    public function store(StoreQuoteRequest $request, CreateQuote $createQuote): RedirectResponse
    {
        $quote = $createQuote->handle(QuoteData::from($request->validated()), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Devis :number créé.', ['number' => $quote->number])]);

        return to_route('tools.quotes.show', $quote);
    }

    public function show(Quote $quote): Response
    {
        $this->authorize('view', $quote);

        $quote->load(['statusChanges.author', 'creator', 'lead', 'invoice']);

        return Inertia::render('quotes/show', [
            'quote' => [
                ...$this->summary($quote),
                'client_street' => $quote->client_street,
                'client_postal_code' => $quote->client_postal_code,
                'client_city' => $quote->client_city,
                'client_country' => $quote->client_country,
                'items' => $quote->items ?? [],
                'vat_rate' => $quote->vat_rate,
                'discount_percent' => $quote->discount_percent,
                'discount_cents' => $quote->discount_cents,
                'subtotal_cents' => $quote->subtotal_cents,
                'vat_cents' => $quote->vat_cents,
                'sent_at' => $quote->sent_at?->toIso8601String(),
                'accepted_at' => $quote->accepted_at?->toIso8601String(),
                'declined_at' => $quote->declined_at?->toIso8601String(),
                'notes' => $quote->notes,
                'created_by' => $quote->creator?->name,
                'created_by_avatar' => $quote->creator?->avatar,
            ],
            'history' => $quote->statusChanges->map(fn (QuoteStatusChange $change): array => [
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

    public function pdf(Quote $quote, RenderQuotePdf $renderPdf): HttpResponse
    {
        $this->authorize('view', $quote);

        abort_unless(DocRaptor::fromConfig()->isConfigured(), 503, __('La génération de PDF n\'est pas configurée.'));

        $pdf = (string) $renderPdf->handle($quote);
        $filename = RenderQuotePdf::filename($quote);

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    public function send(Quote $quote, SendQuote $sendQuote): RedirectResponse
    {
        $this->authorize('update', $quote);

        $withPdf = $sendQuote->handle($quote, auth()->user());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $withPdf
                ? __('Devis :number envoyé avec le PDF à :email.', ['number' => $quote->number, 'email' => $quote->client_email])
                : __('Devis :number envoyé à :email (sans PDF, DocRaptor non configuré).', ['number' => $quote->number, 'email' => $quote->client_email]),
        ]);

        return back();
    }

    public function accept(Quote $quote, AcceptQuote $acceptQuote): RedirectResponse
    {
        $this->authorize('update', $quote);

        $acceptQuote->handle($quote, auth()->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Devis :number marqué accepté.', ['number' => $quote->number])]);

        return back();
    }

    public function decline(DeclineQuoteRequest $request, Quote $quote, DeclineQuote $declineQuote): RedirectResponse
    {
        /** @var string|null $reason */
        $reason = $request->validated('reason');

        $declineQuote->handle($quote, $reason, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Devis :number marqué refusé.', ['number' => $quote->number])]);

        return back();
    }

    public function invoice(Quote $quote, ConvertQuoteToInvoice $convert): RedirectResponse
    {
        $this->authorize('update', $quote);

        $invoice = $convert->handle($quote, auth()->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Facture :invoice créée depuis le devis :number.', ['invoice' => $invoice->number, 'number' => $quote->number])]);

        return to_route('invoices.show', $invoice);
    }

    /**
     * Champs communs à la liste et à la fiche.
     *
     * @return array<string, mixed>
     */
    /** Rattache le devis à un lead ou à un dossier client (null détache). */
    public function link(LinkQuoteLeadRequest $request, Quote $quote, LinkQuoteToLead $linkQuoteToLead): RedirectResponse
    {
        $this->authorize('update', $quote);

        $leadId = $request->validated('lead_id');
        $lead = $leadId === null ? null : Lead::query()->findOrFail((int) $leadId);
        $linkQuoteToLead->handle($quote, $lead, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => $lead instanceof Lead
            ? __('Devis :number rattaché à :name.', ['number' => $quote->number, 'name' => $lead->fullName()])
            : __('Devis :number détaché.', ['number' => $quote->number])]);

        return back();
    }

    public function bulkSend(BulkQuotesRequest $request, SendQuotes $sendQuotes): RedirectResponse
    {
        $result = $sendQuotes->handle(Quote::query()->whereIn('id', $request->ids())->get(), $request->user());

        Inertia::flash('toast', $this->bulkToast($result['sent'], $result['skipped'], __(':count devis envoyé(s).', ['count' => count($result['sent'])]), __('Aucun devis envoyé : les devis cochés ne sont pas envoyables (statut ou e-mail manquant).')));

        return back();
    }

    public function bulkAccept(BulkQuotesRequest $request, AcceptQuotes $acceptQuotes): RedirectResponse
    {
        $result = $acceptQuotes->handle(Quote::query()->whereIn('id', $request->ids())->get(), $request->user());

        Inertia::flash('toast', $this->bulkToast($result['accepted'], $result['skipped'], __(':count devis accepté(s).', ['count' => count($result['accepted'])]), __('Aucun devis accepté : les devis cochés ne peuvent pas l\'être depuis leur statut.')));

        return back();
    }

    /**
     * Toast d'une action groupée : succès, avertissement si rien n'a été fait,
     * succès nuancé de la liste des devis ignorés.
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

        return ['type' => 'warning', 'message' => $success.' '.__('Ignoré(s) : :numbers.', ['numbers' => implode(', ', $skipped)])];
    }

    /**
     * Devis tel qu'il apparaît dans les listes et sur sa fiche.
     *
     * @return array<string, mixed>
     */
    private function summary(Quote $quote): array
    {
        return [
            'id' => $quote->id,
            'uuid' => $quote->uuid,
            'number' => $quote->number,
            'client_name' => $quote->client_name,
            'client_email' => $quote->client_email,
            'lead' => LeadController::linkSummary($quote->lead),
            'invoice' => $quote->invoice === null ? null : ['id' => $quote->invoice->id, 'uuid' => $quote->invoice->uuid, 'number' => $quote->invoice->number],
            'amount_cents' => $quote->amount_cents,
            'currency' => $quote->currency->value,
            'status' => $quote->status->value,
            'status_label' => $quote->status->label(),
            'issued_at' => $quote->issued_at->toDateString(),
            'valid_until' => $quote->valid_until->toDateString(),
            'can_send' => $quote->status->canTransitionTo(QuoteStatus::Sent) && $quote->client_email !== null,
            'can_accept' => $quote->status->canTransitionTo(QuoteStatus::Accepted),
            'can_decline' => $quote->status->canTransitionTo(QuoteStatus::Declined),
            'can_invoice' => $quote->status->canTransitionTo(QuoteStatus::Invoiced),
            'can_edit' => UpdateQuote::isEditable($quote),
        ];
    }
}
