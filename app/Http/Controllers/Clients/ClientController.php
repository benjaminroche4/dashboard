<?php

declare(strict_types=1);

namespace App\Http\Controllers\Clients;

use App\Actions\Clients\SetClientPriority;
use App\Actions\Clients\SuggestClientProperties;
use App\Enums\ClientPriority;
use App\Enums\GuarantorType;
use App\Enums\LeadStatus;
use App\Enums\PropertyType;
use App\Enums\VisitStatus;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Tools\ActivityController;
use App\Http\Requests\Clients\SetClientPriorityRequest;
use App\Models\Activity;
use App\Models\DocumentRequest;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\LeadNote;
use App\Models\LeadPartner;
use App\Models\LeadStatusChange;
use App\Models\PartnerContact;
use App\Models\Property;
use App\Models\Quote;
use App\Models\Visit;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Clients : les leads convertis, vus comme des dossiers en cours.
 */
class ClientController extends Controller
{
    use AuthorizesRequests;

    /** Dossiers : un client par lead converti, les plus prioritaires puis les plus récents. */
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
            ->sortBy([['priority_rank', 'desc'], ['converted_at', 'desc']])
            ->values()
            ->all();

        return Inertia::render('clients/index', [
            'clients' => $clients,
            'priorities' => ClientPriority::options(),
            'realtimeOnly' => ['clients'],
        ]);
    }

    /** Priorité d'un dossier (menu de la fiche). */
    public function priority(SetClientPriorityRequest $request, Lead $lead, SetClientPriority $setPriority): RedirectResponse
    {
        $this->authorize('update', $lead);
        abort_unless($lead->status === LeadStatus::Converted, 404);

        $lead = $setPriority->handle($lead, ClientPriority::from((string) $request->validated('priority')), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Dossier :name en priorité :priority.', ['name' => $lead->fullName(), 'priority' => mb_strtolower($lead->priority->label())])]);

        return back();
    }

    /** Dossier d'un client : coordonnées, projet, devis, factures, documents, partenaires et notes. */
    public function show(Lead $lead, SuggestClientProperties $suggest): Response
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
            'visits.property',
            'visits.agent.agency',
            'visits.assignee',
            'visits.creator',
            'visits.reportAuthor',
            'visits.lead',
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
            'priorities' => ClientPriority::options(),
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
            // Visites du client, les plus récentes en premier, même forme que la page Visites.
            'visits' => $lead->visits->sortByDesc('scheduled_at')->values()->map(fn (Visit $visit): array => VisitController::summary($visit))->all(),
            // Biens rattachés au dossier, avec les visites de ce client sur chacun.
            'properties' => $lead->properties()->with(['agent'])->orderByPivot('created_at', 'desc')->get()->map(function (Property $property) use ($lead): array {
                $visits = $lead->visits->where('property_id', $property->id);
                $next = $visits->where('status', VisitStatus::Planned)->sortBy('scheduled_at')->first();

                return [
                    'id' => $property->id,
                    'uuid' => $property->uuid,
                    'label' => $property->label(),
                    'street' => $property->street,
                    'postal_code' => $property->postal_code,
                    'city' => $property->city,
                    'property_type_label' => $property->property_type?->label(),
                    'surface_m2' => $property->surface_m2,
                    'rent_cents' => $property->rent_cents,
                    'currency' => $property->currency->value,
                    'listing_url' => $property->listing_url,
                    'agent' => $property->agent?->fullName(),
                    'visits_count' => $visits->count(),
                    'next_visit_at' => $next instanceof Visit ? $next->scheduled_at->toIso8601String() : null,
                ];
            })->all(),
            // Biens de l'annuaire qui correspondent au projet (budget, quartiers, type, meublé), hors rattachés et visités.
            'suggestedProperties' => array_map(SuggestClientProperties::summary(...), $suggest->handle($lead)),
            // Biens de l'annuaire non encore rattachés, pour « Lier un bien ».
            'propertyOptions' => Property::query()->whereDoesntHave('leads', fn ($query) => $query->whereKey($lead->id))->latest()->get()
                ->map(fn (Property $property): array => ['id' => $property->id, 'label' => $property->label(), 'street' => $property->street, 'postal_code' => $property->postal_code, 'city' => $property->city, 'photo' => $property->photoUrls()[0] ?? null])
                ->all(),
            'notes' => $lead->notes->map(fn (LeadNote $note): array => [
                'id' => $note->id,
                'body' => $note->body,
                'by' => $note->author?->name,
                'avatar' => $note->author?->avatar,
                'at' => $note->created_at?->toIso8601String(),
            ])->all(),
            // Journal : les 10 dernières actions du backoffice sur ce dossier.
            'activities' => Activity::query()->with(['actor', 'lead'])->where('lead_id', $lead->id)->latest('created_at')->latest('id')->limit(10)->get()
                ->map(fn (Activity $activity): array => ActivityController::summary($activity))
                ->all(),
        ]);
    }

    /** Visites : page prête à accueillir les visites planifiées pour les clients. */
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
            'priority' => $lead->priority->value,
            'priority_label' => $lead->priority->label(),
            'priority_rank' => $lead->priority->rank(),
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
