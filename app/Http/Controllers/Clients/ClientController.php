<?php

declare(strict_types=1);

namespace App\Http\Controllers\Clients;

use App\Enums\GuarantorType;
use App\Enums\LeadStatus;
use App\Enums\PropertyType;
use App\Http\Controllers\Controller;
use App\Models\DocumentRequest;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\LeadNote;
use App\Models\LeadPartner;
use App\Models\LeadStatusChange;
use App\Models\PartnerContact;
use App\Models\Quote;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Clients : les leads convertis, vus comme des dossiers en cours.
 */
class ClientController extends Controller
{
    use AuthorizesRequests;

    /** Dossiers : un client par lead converti, du plus récent au plus ancien. */
    public function index(): Response
    {
        $this->authorize('viewAny', Lead::class);

        $clients = Lead::query()
            ->where('status', LeadStatus::Converted)
            ->with([
                'assignee',
                'statusChanges' => fn ($query) => $query->where('to_status', LeadStatus::Converted)->latest(),
            ])
            ->withCount(['invoices', 'documentRequests'])
            ->get()
            ->map(fn (Lead $lead): array => $this->summary($lead))
            ->sortByDesc('converted_at')
            ->values()
            ->all();

        return Inertia::render('clients/index', [
            'clients' => $clients,
            'realtimeOnly' => ['clients'],
        ]);
    }

    /** Dossier d'un client : coordonnées, projet, devis, factures, documents, partenaires et notes. */
    public function show(Lead $lead): Response
    {
        $this->authorize('view', $lead);

        // Seul un lead converti est un client : les autres n'ont pas de dossier.
        abort_unless($lead->status === LeadStatus::Converted, 404);

        $lead->load([
            'assignee',
            'statusChanges' => fn ($query) => $query->where('to_status', LeadStatus::Converted)->latest(),
            'invoices',
            'quotes',
            'documentRequests',
            'partnerLinks.partner.contacts',
            'notes.author',
        ]);
        $lead->loadCount(['invoices', 'documentRequests']);

        $totals = [];
        foreach ($lead->invoices as $invoice) {
            $currency = $invoice->currency->value;
            $totals[$currency] ??= ['currency' => $currency, 'invoiced_cents' => 0, 'paid_cents' => 0, 'due_cents' => 0];

            if ($invoice->status->value === 'cancelled') {
                continue;
            }

            $totals[$currency]['invoiced_cents'] += $invoice->amount_cents;

            if ($invoice->status->value === 'paid') {
                $totals[$currency]['paid_cents'] += $invoice->amount_cents;
            } else {
                $totals[$currency]['due_cents'] += $invoice->dueCents();
            }
        }

        return Inertia::render('clients/show', [
            'client' => [
                ...$this->summary($lead),
                'language_label' => $lead->language->label(),
                'origin_city' => $lead->origin_city,
                'budget_cents' => $lead->budget_cents,
                'currency' => $lead->currency->value,
                'districts' => $lead->districts ?? [],
                'property_types' => $lead->property_types?->map(fn (PropertyType $type): string => $type->label())->all() ?? [],
                'duration_label' => $lead->duration?->label(),
                'furnished_label' => $lead->furnished?->label(),
                'guarantor_label' => $lead->guarantors === null || $lead->guarantors->isEmpty()
                    ? null
                    : $lead->guarantors->map(fn (GuarantorType $type): string => $type->label())->implode(', '),
                'message' => $lead->message,
                'score' => $lead->score,
            ],
            'totals' => array_values($totals),
            'invoices' => $lead->invoices->map(fn (Invoice $invoice): array => [
                'id' => $invoice->id,
                'uuid' => $invoice->uuid,
                'number' => $invoice->number,
                'client_name' => $invoice->client_name,
                'amount_cents' => $invoice->amount_cents,
                'currency' => $invoice->currency->value,
                'status' => $invoice->status->value,
                'status_label' => $invoice->status->label(),
                'issued_at' => $invoice->issued_at->toDateString(),
            ])->all(),
            'quotes' => $lead->quotes->map(fn (Quote $quote): array => [
                'id' => $quote->id,
                'uuid' => $quote->uuid,
                'number' => $quote->number,
                'client_name' => $quote->client_name,
                'amount_cents' => $quote->amount_cents,
                'currency' => $quote->currency->value,
                'status' => $quote->status->value,
                'status_label' => $quote->status->label(),
                'issued_at' => $quote->issued_at->toDateString(),
                'valid_until' => $quote->valid_until->toDateString(),
            ])->all(),
            'documentRequests' => $lead->documentRequests->map(fn (DocumentRequest $request): array => [
                'id' => $request->id,
                'name' => $request->fullName(),
                'person_count' => count($request->persons),
                'document_count' => $request->documentCount(),
                'created_at' => $request->created_at?->toIso8601String(),
            ])->all(),
            'partners' => $lead->partnerLinks->map(fn (LeadPartner $link): array => [
                'id' => $link->id,
                'role' => $link->role->value,
                'role_label' => $link->role->label(),
                'note' => $link->note,
                'partner' => [
                    'id' => $link->partner->id,
                    'uuid' => $link->partner->uuid,
                    'name' => $link->partner->name,
                    'type' => $link->partner->type->value,
                    'type_label' => $link->partner->type->label(),
                    'email' => $link->partner->email,
                    'phone' => $link->partner->phone,
                    'contacts' => $link->partner->contacts->map(fn (PartnerContact $contact): array => ['id' => $contact->id, 'name' => $contact->fullName(), 'email' => $contact->email])->all(),
                ],
            ])->all(),
            'notes' => $lead->notes->map(fn (LeadNote $note): array => [
                'id' => $note->id,
                'body' => $note->body,
                'by' => $note->author?->name,
                'avatar' => $note->author?->avatar,
                'at' => $note->created_at?->toIso8601String(),
            ])->all(),
        ]);
    }

    /** Visites : page prête à accueillir les visites planifiées pour les clients. */
    public function visits(): Response
    {
        $this->authorize('viewAny', Lead::class);

        return Inertia::render('clients/visits');
    }

    /**
     * @return array<string, mixed>
     */
    private function summary(Lead $lead): array
    {
        /** @var LeadStatusChange|null $conversion */
        $conversion = $lead->statusChanges->first();

        return [
            'id' => $lead->id,
            'uuid' => $lead->uuid,
            'reference' => $lead->reference,
            'name' => $lead->fullName(),
            'company' => $lead->company,
            'email' => $lead->email,
            'phone' => $lead->phone,
            'offer_label' => $lead->offer?->label(),
            'arrival_at' => $lead->arrival_at?->toDateString(),
            'converted_at' => ($conversion instanceof LeadStatusChange ? $conversion->created_at : $lead->updated_at)?->toIso8601String(),
            'assignee' => $lead->assignee === null ? null : [
                'id' => $lead->assignee->id,
                'name' => $lead->assignee->name,
                'avatar' => $lead->assignee->avatar,
            ],
            'invoices_count' => $lead->invoices_count,
            'document_requests_count' => $lead->document_requests_count,
        ];
    }
}
