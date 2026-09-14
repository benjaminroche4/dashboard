<?php

declare(strict_types=1);

namespace App\Http\Controllers\Clients;

use App\Actions\Clients\CloseClientDossier;
use App\Actions\Clients\CreateClientDossier;
use App\Actions\Clients\DeleteClientGuarantor;
use App\Actions\Clients\DeleteClientWatcher;
use App\Actions\Clients\ReopenClientDossier;
use App\Actions\Clients\SaveClientGuarantor;
use App\Actions\Clients\SaveClientWatcher;
use App\Actions\Clients\SendPropertyDecisionReminders;
use App\Actions\Clients\SetClientPriority;
use App\Actions\Clients\SuggestClientAgents;
use App\Actions\Clients\SuggestClientProperties;
use App\Actions\Clients\SummarizeDossierReadiness;
use App\Actions\Clients\UpdateClientDossier;
use App\Actions\Clients\UpdateClientPeople;
use App\Actions\Clients\UpdateTenantProfile;
use App\Data\ClientDossierData;
use App\Data\ClientPeopleData;
use App\Data\LeadData;
use App\Data\LeadGuarantorData;
use App\Data\LeadWatcherData;
use App\Data\TenantProfileData;
use App\Enums\ClientClosingReason;
use App\Enums\ClientPriority;
use App\Enums\Currency;
use App\Enums\EmploymentStatus;
use App\Enums\Furnished;
use App\Enums\GuarantorType;
use App\Enums\LeadDuration;
use App\Enums\LeadLanguage;
use App\Enums\LeadStatus;
use App\Enums\PartnerRole;
use App\Enums\PropertyApplicationStatus;
use App\Enums\PropertyType;
use App\Enums\ResidencyStatus;
use App\Enums\StaffFunction;
use App\Enums\TenantSlot;
use App\Enums\VisitStatus;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Leads\LeadController;
use App\Http\Controllers\RealEstate\AgentController;
use App\Http\Requests\Clients\CloseClientRequest;
use App\Http\Requests\Clients\SaveClientGuarantorRequest;
use App\Http\Requests\Clients\SaveClientWatcherRequest;
use App\Http\Requests\Clients\SetClientPriorityRequest;
use App\Http\Requests\Clients\StoreClientRequest;
use App\Http\Requests\Clients\UpdateClientPeopleRequest;
use App\Http\Requests\Clients\UpdateClientRequest;
use App\Http\Requests\Clients\UpdateTenantProfileRequest;
use App\Models\Agent;
use App\Models\DocumentRequest;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\LeadGuarantor;
use App\Models\LeadNote;
use App\Models\LeadPartner;
use App\Models\LeadStatusChange;
use App\Models\LeadWatcher;
use App\Models\Partner;
use App\Models\PartnerContact;
use App\Models\Property;
use App\Models\Quote;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Clients : les leads convertis, vus comme des dossiers en cours.
 */
class ClientController extends Controller
{
    use AuthorizesRequests;

    /** Dossiers : un client par lead converti, les plus prioritaires puis les plus récents. */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Lead::class);

        // Les dossiers clôturés ne se chargent qu'à la demande (`?archived=1`).
        $withArchived = $request->boolean('archived');

        $clients = Lead::query()
            ->where(fn (Builder $query): Builder => $withArchived
                ? $query->where('status', LeadStatus::Converted)->orWhereNotNull('closed_at')
                : $query->where('status', LeadStatus::Converted))
            ->with([
                'assignee',
                'coAssignee',
                // Le résumé porte l'agent du dossier : chargé ici, pas ligne par ligne.
                'agent.agency',
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
            'archived' => [
                'loaded' => $withArchived,
                'count' => Lead::query()->whereNotNull('closed_at')->count(),
            ],
            'closingReasons' => ClientClosingReason::options(),
            'priorities' => ClientPriority::options(),
            // Listes du dialogue « Nouveau dossier », créé sans passer par un lead.
            'languages' => LeadLanguage::options(),
            'currencies' => array_map(fn (Currency $currency): string => $currency->value, Currency::cases()),
            // Filtres de la liste : priorité, formule, suivi et arrivée.
            'offers' => LeadController::offers(),
            'realtimeOnly' => ['clients'],
        ]);
    }

    /**
     * Ouvre un dossier client sans lead : recommandation, client déjà signé…
     * Le dossier reste un lead converti, avec sa référence et son historique.
     */
    public function store(StoreClientRequest $request, CreateClientDossier $create): RedirectResponse
    {
        $this->authorize('create', Lead::class);

        $lead = $create->handle(LeadData::from($request->validated()), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Dossier client ouvert pour :name.', ['name' => $lead->fullName()])]);

        return to_route('clients.show', $lead);
    }

    /**
     * Modification d'un dossier client, sur sa propre page : le dossier ne
     * passe plus par la fiche lead ni par la Converting Machine.
     */
    public function edit(Lead $lead): Response
    {
        $this->authorize('update', $lead);
        abort_unless($lead->status === LeadStatus::Converted, 404);

        return Inertia::render('clients/edit', [
            'client' => [
                'uuid' => $lead->uuid,
                'name' => $lead->householdName(),
                'reference' => $lead->reference,
                'first_name' => $lead->first_name,
                'last_name' => $lead->last_name,
                'email' => $lead->email ?? '',
                'phone' => $lead->phone ?? '',
                'company' => $lead->company ?? '',
                'language' => $lead->language->value,
                'offer' => $lead->offer === null ? '' : $lead->offer->value,
                'budget' => $lead->budget_cents === null ? '' : (string) ($lead->budget_cents / 100),
                'currency' => $lead->currency->value,
                'arrival_at' => $lead->arrival_at?->toDateString() ?? '',
                'districts' => $lead->districts ?? [],
                'property_types' => $lead->property_types?->map(fn (PropertyType $type): string => $type->value)->all() ?? [],
                'duration' => $lead->duration === null ? '' : $lead->duration->value,
                'guarantors' => $lead->guarantors?->map(fn (GuarantorType $type): string => $type->value)->all() ?? [],
                'furnished' => $lead->furnished === null ? '' : $lead->furnished->value,
                'origin_city' => $lead->origin_city ?? '',
                'message' => $lead->message ?? '',
            ],
            'offers' => LeadController::offers(),
            'languages' => LeadLanguage::options(),
            'propertyTypes' => PropertyType::options(),
            'durations' => LeadDuration::options(),
            'guarantors' => GuarantorType::options(),
            'furnishedOptions' => Furnished::options(),
            'currencies' => array_map(
                fn (Currency $currency): array => ['value' => $currency->value, 'label' => $currency->label()],
                Currency::cases(),
            ),
        ]);
    }

    public function update(UpdateClientRequest $request, Lead $lead, UpdateClientDossier $update): RedirectResponse
    {
        $this->authorize('update', $lead);
        abort_unless($lead->status === LeadStatus::Converted, 404);

        $update->handle($lead, ClientDossierData::from($request->validated()), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Dossier client mis à jour.')]);

        return to_route('clients.show', $lead);
    }

    /** Clôture d'un dossier : il passe en « Archivé » avec son motif. */
    public function close(CloseClientRequest $request, Lead $lead, CloseClientDossier $close): RedirectResponse
    {
        $this->authorize('update', $lead);
        abort_unless($lead->status === LeadStatus::Converted, 404);

        $lead = $close->handle($lead, ClientClosingReason::from((string) $request->validated('reason')), $request->validated('note'), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Dossier :name clôturé.', ['name' => $lead->householdName()])]);

        return back();
    }

    /** Réouverture d'un dossier clôturé : il redevient un client suivi. */
    public function reopen(Request $request, Lead $lead, ReopenClientDossier $reopen): RedirectResponse
    {
        $this->authorize('update', $lead);
        abort_unless($lead->isClosed(), 404);

        $lead = $reopen->handle($lead, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Dossier :name rouvert.', ['name' => $lead->householdName()])]);

        return back();
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

    /** Personnes du dossier : second locataire et second membre du suivi. */
    public function people(UpdateClientPeopleRequest $request, Lead $lead, UpdateClientPeople $updatePeople): RedirectResponse
    {
        $this->authorize('update', $lead);
        abort_unless($lead->status === LeadStatus::Converted, 404);

        $updatePeople->handle($lead, ClientPeopleData::from($request->validated()), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Personnes du dossier mises à jour.')]);

        return back();
    }

    /**
     * Détails des locataires du dossier, par emplacement : valeurs brutes pour
     * le formulaire et libellés pour l'affichage. Le second locataire n'y
     * figure que s'il existe.
     *
     * @return array<string, array<string, mixed>>
     */
    private function tenantProfiles(Lead $lead): array
    {
        $slots = [TenantSlot::Primary, ...($lead->co_first_name === null ? [] : [TenantSlot::Co])];

        return collect($slots)->mapWithKeys(function (TenantSlot $slot) use ($lead): array {
            $profile = $lead->tenant_profiles[$slot->value] ?? [];
            $residency = ResidencyStatus::tryFrom((string) ($profile['residency_status'] ?? ''));
            $employment = EmploymentStatus::tryFrom((string) ($profile['employment_status'] ?? ''));

            return [$slot->value => [
                'name' => $slot->name($lead),
                'role' => $slot->label(),
                'birth_date' => $profile['birth_date'] ?? null,
                'nationality' => $profile['nationality'] ?? null,
                'birth_place' => $profile['birth_place'] ?? null,
                'residency_status' => $residency?->value,
                'residency_label' => $residency?->label(),
                'residency_needs_document' => $residency?->needsDocument() ?? false,
                'residency_number' => $profile['residency_number'] ?? null,
                'residency_expires_at' => $profile['residency_expires_at'] ?? null,
                'employment_status' => $employment?->value,
                'employment_label' => $employment?->label(),
                'employer' => $profile['employer'] ?? null,
                'income_cents' => $profile['income_cents'] ?? null,
            ]];
        })->all();
    }

    /** Détails d'un locataire du dossier : état civil, séjour, situation professionnelle. */
    public function tenantProfile(UpdateTenantProfileRequest $request, Lead $lead, string $slot, UpdateTenantProfile $update): RedirectResponse
    {
        $this->authorize('update', $lead);
        abort_unless($lead->status === LeadStatus::Converted, 404);

        $tenant = TenantSlot::tryFrom($slot);
        abort_if($tenant === null, 404);
        // Pas de détails sur un second locataire qui n'existe pas.
        abort_if($tenant === TenantSlot::Co && $lead->co_first_name === null, 404);

        $update->handle($lead, $tenant, TenantProfileData::from($request->validated()), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Informations de :name mises à jour.', ['name' => $tenant->name($lead)])]);

        return back();
    }

    /** Ajoute ou met à jour un garant du dossier. */
    public function saveGuarantor(SaveClientGuarantorRequest $request, Lead $lead, SaveClientGuarantor $save, ?LeadGuarantor $guarantor = null): RedirectResponse
    {
        $this->authorize('update', $lead);
        abort_unless($lead->status === LeadStatus::Converted, 404);
        abort_if($guarantor instanceof LeadGuarantor && $guarantor->lead_id !== $lead->id, 404);

        $save->handle($lead, LeadGuarantorData::from($request->validated()), $guarantor, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Garant enregistré.')]);

        return back();
    }

    /** Retire un garant du dossier. */
    public function destroyGuarantor(Request $request, Lead $lead, LeadGuarantor $guarantor, DeleteClientGuarantor $delete): RedirectResponse
    {
        $this->authorize('update', $lead);
        abort_unless($guarantor->lead_id === $lead->id, 404);

        $delete->handle($guarantor, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Garant retiré.')]);

        return back();
    }

    /** Ajoute ou met à jour une personne de suivi du dossier. */
    public function saveWatcher(SaveClientWatcherRequest $request, Lead $lead, SaveClientWatcher $save, ?LeadWatcher $watcher = null): RedirectResponse
    {
        $this->authorize('update', $lead);
        abort_unless($lead->status === LeadStatus::Converted, 404);
        abort_if($watcher instanceof LeadWatcher && $watcher->lead_id !== $lead->id, 404);

        $save->handle($lead, LeadWatcherData::from($request->validated()), $watcher, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Personne de suivi enregistrée.')]);

        return back();
    }

    /** Retire une personne de suivi du dossier. */
    public function destroyWatcher(Request $request, Lead $lead, LeadWatcher $watcher, DeleteClientWatcher $delete): RedirectResponse
    {
        $this->authorize('update', $lead);
        abort_unless($watcher->lead_id === $lead->id, 404);

        $delete->handle($watcher, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Personne de suivi retirée.')]);

        return back();
    }

    /** Dossier d'un client : coordonnées, projet, devis, factures, documents, partenaires et notes. */
    public function show(Request $request, Lead $lead, SuggestClientProperties $suggest, SuggestClientAgents $suggestAgents, SummarizeDossierReadiness $readiness): Response|RedirectResponse
    {
        $this->authorize('view', $lead);

        // Seul un client — suivi ou clôturé — a un dossier : les autres leads, non.
        abort_unless($lead->isClient(), 404);

        // Un dossier se lit à travers sa formule (visites, facture, e-mails) :
        // sans elle, on renvoie à la fiche lead pour la choisir d'abord.
        if ($lead->offer === null) {
            Inertia::flash('toast', ['type' => 'warning', 'message' => __('Choisissez la formule de :name (Accompagné ou Confié) pour ouvrir son dossier.', ['name' => $lead->fullName()])]);

            return to_route('leads.show', $lead);
        }

        $lead->load([
            'assignee',
            'coAssignee',
            'statusChanges' => fn ($query) => $query->where('to_status', LeadStatus::Converted)->latest(),
            'invoices',
            'quotes',
            'documentRequests.uploads',
            'partnerLinks.partner.contacts',
            'agent.agency',
            'guarantorPeople',
            'notes.author',
            'visits.property',
            'visits.agent.agency',
            'visits.assignee',
            'visits.creator',
            'visits.reportAuthor',
            'visits.lead.properties',
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
            'closingReasons' => ClientClosingReason::options(),
            // Détails des locataires : les garants et le suivi n'en ont pas.
            'tenantProfiles' => $this->tenantProfiles($lead),
            'residencyStatuses' => ResidencyStatus::options(),
            'employmentStatuses' => EmploymentStatus::options(),
            // Garants du dossier : fiches saisies par l'équipe.
            'guarantors' => $lead->guarantorPeople->map(fn (LeadGuarantor $guarantor): array => [
                'uuid' => $guarantor->uuid,
                'first_name' => $guarantor->first_name,
                'last_name' => $guarantor->last_name,
                'name' => $guarantor->fullName(),
                'email' => $guarantor->email,
                'phone' => $guarantor->phone,
                'employment_status' => $guarantor->employment_status?->value,
                'employment_status_label' => $guarantor->employment_status?->label(),
                'occupation' => $guarantor->occupation,
                'income_cents' => $guarantor->income_cents,
                'note' => $guarantor->note,
            ])->all(),
            // Personnes de suivi : en copie des e-mails du dossier.
            'watchers' => $lead->watchers->map(fn (LeadWatcher $watcher): array => [
                'uuid' => $watcher->uuid,
                'name' => $watcher->name,
                'email' => $watcher->email,
                'phone' => $watcher->phone,
                'role' => $watcher->role,
            ])->all(),
            'totals' => array_values($totals),
            // Où en est la recherche : ce qu'on a montré, ce qui est écarté,
            // et les candidatures en jeu.
            'progress' => [
                'visits_done' => $lead->visits->where('status', VisitStatus::Done)->count(),
                // Les refus **du client** : les biens qu'il a écartés. Une
                // candidature refusée par le bailleur n'est pas son choix.
                'properties_refused' => $lead->properties()
                    ->wherePivot('status', PropertyApplicationStatus::Declined->value)
                    ->count(),
                'applications' => $lead->properties()
                    ->wherePivotIn('status', [PropertyApplicationStatus::Applied->value, PropertyApplicationStatus::Accepted->value])
                    ->count(),
            ],
            // Le dossier est-il présentable ? C'est la mesure que l'équipe
            // regarde en premier sur l'aperçu.
            'readiness' => $readiness->handle($lead)->toArray(),
            'propertyStatuses' => PropertyApplicationStatus::options(),
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
            'properties' => $lead->properties()->with(['agent', 'assignedLead'])->orderByPivot('created_at', 'desc')->get()->map(function (Property $property) use ($lead): array {
                $visits = $lead->visits->where('property_id', $property->id);
                $next = $visits->where('status', VisitStatus::Planned)->sortBy('scheduled_at')->first();
                // Dernière visite effectuée : c'est d'elle que court l'attente
                // d'une décision, et le rappel envoyé aux personnes de suivi.
                $visited = $visits->where('status', VisitStatus::Done)->sortByDesc('scheduled_at')->first();

                return [
                    'id' => $property->id,
                    'uuid' => $property->uuid,
                    'label' => $property->label(),
                    'photo' => $property->coverUrl(),
                    'street' => $property->street,
                    'postal_code' => $property->postal_code,
                    'city' => $property->city,
                    'property_type_label' => $property->property_type?->label(),
                    'surface_m2' => $property->surface_m2,
                    'rent_cents' => $property->rent_cents,
                    'currency' => $property->currency->value,
                    'listing_url' => $property->listing_url,
                    'agent' => $property->agent?->fullName(),
                    // Bien attribué : le dossier doit le voir, même si c'est à un autre client.
                    'assigned_lead' => $property->assignedLead === null ? null : [
                        'uuid' => $property->assignedLead->uuid,
                        'name' => $property->assignedLead->householdName(),
                    ],
                    'visits_count' => $visits->count(),
                    'next_visit_at' => $next instanceof Visit ? $next->scheduled_at->toIso8601String() : null,
                    // Suite de la visite : positionnement du client, puis candidature.
                    'status' => $property->getRelationValue('pivot')->status->value,
                    'status_label' => $property->getRelationValue('pivot')->status->label(),
                    'status_at' => $property->getRelationValue('pivot')->status_at?->toIso8601String(),
                    'visited_at' => $visited instanceof Visit ? $visited->scheduled_at->toIso8601String() : null,
                    // Le client tarde : le badge le signale, la relance est partie ou va partir.
                    'decision_due' => $property->getRelationValue('pivot')->status === PropertyApplicationStatus::Pending
                        && $visited instanceof Visit
                        && $visited->scheduled_at->lte(now()->subHours(SendPropertyDecisionReminders::hours())),
                    // Quand l'équipe relance, et quand elle l'a fait pour la dernière fois.
                    'reminded_at' => $property->getRelationValue('pivot')->decision_reminded_at?->toIso8601String(),
                    'reminder_at' => $property->getRelationValue('pivot')->status === PropertyApplicationStatus::Pending
                        ? SendPropertyDecisionReminders::nextReminderAt(
                            $visited instanceof Visit ? $visited->scheduled_at : null,
                            $property->getRelationValue('pivot')->decision_reminded_at,
                        )?->toIso8601String()
                        : null,
                ];
            })->all(),
            // Biens de l'annuaire qui correspondent au projet (budget, quartiers, type, meublé), hors rattachés et visités.
            'suggestedProperties' => array_map(SuggestClientProperties::summary(...), $suggest->handle($lead)),
            // Agences (et agents) à contacter pour ce dossier : score à points, raisons en clair, meilleur agent.
            'suggestedAgents' => array_map(SuggestClientAgents::summary(...), $suggestAgents->handle($lead)),
            // Biens de l'annuaire non encore rattachés, pour « Lier un bien ».
            // Un bien attribué (à ce dossier ou à un autre) n'est plus à lier.
            'propertyOptions' => Property::query()->unassigned()->whereDoesntHave('leads', fn ($query) => $query->whereKey($lead->id))->latest()->get()
                ->map(fn (Property $property): array => ['id' => $property->id, 'label' => $property->label(), 'street' => $property->street, 'postal_code' => $property->postal_code, 'city' => $property->city, 'photo' => $property->photoUrls()[0] ?? null])
                ->all(),
            // Mêmes bulles que la fiche lead : le dossier reçoit donc les
            // notes sous la même forme (auteur, « à moi », droits d'édition).
            'notes' => $lead->notes->map(fn (LeadNote $note): array => LeadController::note($note))->all(),
            // Le dossier se gère sans repasser par la fiche lead : l'agent
            // immobilier et les partenaires s'y ajoutent, avec les mêmes
            // cartes et les mêmes routes que la fiche lead.
            'agents' => Agent::query()->with('agency')->withFavoriteOf($request->user())->orderBy('last_name')->orderBy('first_name')->get()
                ->map(fn (Agent $agent): array => AgentController::option($agent))->all(),
            'partnerOptions' => Partner::query()->orderBy('name')->get()
                ->map(fn (Partner $partner): array => ['id' => $partner->id, 'name' => $partner->name, 'type' => $partner->type->value, 'type_label' => $partner->type->label()])->all(),
            'partnerRoles' => PartnerRole::options(),
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
            // Dossier à deux locataires : « Bruno & Charles » plutôt que les noms de famille.
            'name' => $lead->householdName(),
            'company' => $lead->company,
            'email' => $lead->email,
            'phone' => $lead->phone,
            'offer' => $lead->offer?->value,
            'offer_label' => $lead->offer?->label(),
            'priority' => $lead->priority->value,
            'priority_label' => $lead->priority->label(),
            'priority_rank' => $lead->priority->rank(),
            'arrival_at' => $lead->arrival_at?->toDateString(),
            'converted_at' => ($conversion instanceof LeadStatusChange ? $conversion->created_at : $lead->updated_at)?->toIso8601String(),
            // Dossier clôturé : il se lit, ne se modifie plus, et peut être rouvert.
            'closed_at' => $lead->closed_at?->toIso8601String(),
            'closing_reason' => $lead->closing_reason?->value,
            'closing_reason_label' => $lead->closing_reason?->label(),
            'closing_note' => $lead->closing_note,
            'assignee' => $this->follower($lead->assignee),
            // Second locataire du foyer et second membre du suivi (facultatifs).
            'co_tenant' => $lead->coFullName() === null && $lead->co_email === null && $lead->co_phone === null ? null : [
                'first_name' => $lead->co_first_name,
                'last_name' => $lead->co_last_name,
                'name' => $lead->coFullName(),
                'email' => $lead->co_email,
                'phone' => $lead->co_phone,
                // Le revenu se déclare sur la fiche du locataire, avec son
                // statut professionnel et son employeur.
                'income_cents' => $lead->tenantIncomeCents(TenantSlot::Co),
            ],
            // Revenus mensuels nets du foyer, pour la règle « loyer ≤ un tiers des revenus ».
            'income_cents' => $lead->tenantIncomeCents(TenantSlot::Primary),
            'household_income_cents' => $lead->householdIncomeCents(),
            'co_assignee' => $this->follower($lead->coAssignee),
            'invoices_count' => $lead->invoices_count,
            'document_requests_count' => $lead->document_requests_count,
            // Agent immobilier du dossier : même forme que sur la fiche lead,
            // la carte est la même des deux côtés.
            'agent' => $lead->agent === null ? null : [
                'id' => $lead->agent->id,
                'uuid' => $lead->agent->uuid,
                'name' => $lead->agent->fullName(),
                'agency' => $lead->agent->agency?->name,
                'position' => $lead->agent->position?->label(),
                'phone' => $lead->agent->phone,
                'email' => $lead->agent->email,
            ],
        ];
    }

    /**
     * Une personne qui suit le dossier, telle que la fiche l'affiche : nom,
     * fonction dans l'équipe, e-mail et téléphone pour la joindre.
     *
     * @return array<string, mixed>|null
     */
    private function follower(?User $member): ?array
    {
        if (! $member instanceof User) {
            return null;
        }

        return [
            'id' => $member->id,
            'name' => $member->name,
            'avatar' => $member->avatar,
            'email' => $member->email,
            'phone' => $member->phone,
            'functions' => array_map(fn (StaffFunction $function): string => $function->label(), $member->staffFunctions()),
        ];
    }
}
