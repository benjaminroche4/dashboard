<?php

declare(strict_types=1);

namespace App\Http\Controllers\Clients;

use App\Actions\Visits\DeleteVisit;
use App\Actions\Visits\ScheduleVisit;
use App\Actions\Visits\SubmitVisitReport;
use App\Actions\Visits\UpdateVisit;
use App\Data\VisitData;
use App\Data\VisitReportData;
use App\Data\VisitUpdateData;
use App\Enums\LeadStatus;
use App\Enums\VisitMode;
use App\Enums\VisitStatus;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Properties\PropertyController;
use App\Http\Requests\Visits\StoreVisitReportRequest;
use App\Http\Requests\Visits\StoreVisitRequest;
use App\Http\Requests\Visits\UpdateVisitRequest;
use App\Models\Lead;
use App\Models\Property;
use App\Models\Visit;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VisitController extends Controller
{
    use AuthorizesRequests;

    /** Visites à venir en premier, puis les passées ; clients et biens pour en planifier une. */
    public function index(): Response
    {
        $this->authorize('viewAny', Visit::class);

        $visits = Visit::query()
            ->with(['lead', 'property', 'agent.agency', 'assignee', 'creator', 'reportAuthor'])
            ->latest('scheduled_at')
            ->get()
            ->map(fn (Visit $visit): array => self::summary($visit))
            ->all();

        // La liste n'affiche que des visites : les annuaires (clients, biens,
        // agents, propriétaires, agences) ne servent qu'au formulaire, sur sa
        // propre page — les envoyer ici sérialisait cinq tables pour rien.
        return Inertia::render('clients/visits', [
            'visits' => $visits,
            'statuses' => VisitStatus::options(),
            'visitModes' => VisitMode::options(),
            'realtimeOnly' => ['visits'],
        ]);
    }

    /** Page dédiée « Planifier une visite », avec le client présélectionné par `?client=UUID`. */
    public function create(Request $request): Response
    {
        $this->authorize('create', Visit::class);

        $clientUuid = $request->query('client');
        $client = is_string($clientUuid)
            ? Lead::query()->where('uuid', $clientUuid)->where('status', LeadStatus::Converted)->first()
            : null;

        $propertyUuid = $request->query('property');
        $property = is_string($propertyUuid) ? Property::query()->where('uuid', $propertyUuid)->first() : null;

        return Inertia::render('clients/visit-create', [
            'defaultClientId' => $client?->id,
            'defaultPropertyId' => $property?->id,
            ...$this->scheduleOptions(),
        ]);
    }

    /** Fiche d'une visite : créneau, client, bien, agent, compte rendu et notes. */
    public function show(Visit $visit): Response
    {
        $this->authorize('view', $visit);

        $visit->load([
            'lead',
            'property.agent.agency',
            'property.owner',
            'agent.agency',
            'assignee',
            'creator',
            'reportAuthor',
        ]);

        return Inertia::render('clients/visit', [
            'visit' => [
                ...self::summary($visit),
                'created_at' => $visit->created_at?->toIso8601String(),
                'property' => [
                    ...self::summary($visit)['property'],
                    'property_type_label' => $visit->property->property_type?->label(),
                    'furnished_label' => $visit->property->furnished?->label(),
                    'rooms' => $visit->property->rooms,
                    'surface_m2' => $visit->property->surface_m2,
                    'floor_label' => $visit->property->floor?->label(),
                    'charges_cents' => $visit->property->charges_cents,
                    'listing_url' => $visit->property->listing_url,
                    'photos' => $visit->property->photoUrls(),
                    'owner' => $visit->property->owner === null ? null : [
                        'uuid' => $visit->property->owner->uuid,
                        'name' => $visit->property->owner->fullName(),
                    ],
                ],
            ],
            // Les autres visites du même client, pour situer celle-ci dans le dossier.
            'otherVisits' => $visit->lead->visits()
                ->with(['property', 'agent.agency', 'assignee', 'creator', 'reportAuthor', 'lead'])
                ->whereKeyNot($visit->id)
                ->latest('scheduled_at')
                ->limit(5)
                ->get()
                ->map(fn (Visit $other): array => self::summary($other))
                ->all(),
        ]);
    }

    /** Modification d'une visite : même formulaire que la planification, prérempli. */
    public function edit(Visit $visit): Response
    {
        $this->authorize('update', $visit);

        $visit->load(['lead', 'property', 'agent.agency', 'assignee']);

        return Inertia::render('clients/visit-edit', [
            'visit' => self::summary($visit),
            ...$this->scheduleOptions(),
        ]);
    }

    public function store(StoreVisitRequest $request, ScheduleVisit $schedule): RedirectResponse
    {
        $this->authorize('create', Visit::class);

        if ($request->validated('property_id') === null) {
            // Un nouveau bien rejoint l'annuaire : il faut aussi le droit d'y écrire.
            $this->authorize('create', Property::class);
        }

        $visit = $schedule->handle(VisitData::from($request->validated()), $request->user());
        $visit->load(['lead', 'property']);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Visite planifiée pour :name : :property.', ['name' => $visit->lead->fullName(), 'property' => $visit->property->label()])]);

        return to_route('clients.visits');
    }

    /**
     * Clients, biens de l'annuaire et listes du formulaire d'un bien.
     *
     * @return array<string, mixed>
     */
    private function scheduleOptions(): array
    {
        return [
            'clients' => Lead::query()
                ->where('status', LeadStatus::Converted)
                ->orderBy('last_name')->orderBy('first_name')
                ->get()
                ->map(fn (Lead $lead): array => [
                    'id' => $lead->id,
                    'uuid' => $lead->uuid,
                    'name' => $lead->fullName(),
                    'reference' => $lead->reference,
                    // La formule change la visite : sur Confié, l'équipe visite sans le client.
                    'offer' => $lead->offer?->value,
                    'offer_label' => $lead->offer?->label(),
                ])
                ->all(),
            'visitModes' => VisitMode::options(),
            // Un bien attribué à un client est pris : on ne le propose plus en visite.
            'properties' => Property::query()->unassigned()->latest()->get()
                ->map(fn (Property $property): array => ['id' => $property->id, 'label' => $property->label(), 'street' => $property->street, 'postal_code' => $property->postal_code, 'city' => $property->city, 'photo' => $property->photoUrls()[0] ?? null])
                ->all(),
            ...PropertyController::formOptions(),
        ];
    }

    public function update(UpdateVisitRequest $request, Visit $visit, UpdateVisit $update): RedirectResponse
    {
        $this->authorize('update', $visit);

        $visit = $update->handle($visit, VisitUpdateData::from($request->validated()));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Visite :status.', ['status' => mb_strtolower($visit->status->label())])]);

        return back();
    }

    /** Compte rendu rédigé après la visite. */
    public function report(StoreVisitReportRequest $request, Visit $visit, SubmitVisitReport $submit): RedirectResponse
    {
        $this->authorize('update', $visit);

        $visit = $submit->handle($visit, VisitReportData::from($request->validated()), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Compte rendu enregistré pour la visite de :name.', ['name' => $visit->lead->fullName()])]);

        return back();
    }

    public function destroy(Visit $visit, DeleteVisit $delete): RedirectResponse
    {
        $this->authorize('delete', $visit);

        $delete->handle($visit);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Visite supprimée.')]);

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    public static function summary(Visit $visit): array
    {
        return [
            'id' => $visit->id,
            'uuid' => $visit->uuid,
            'scheduled_at' => $visit->scheduled_at->toIso8601String(),
            'status' => $visit->status->value,
            'status_label' => $visit->status->label(),
            // Visite faite par l'équipe pour le client, ou visite autonome du client.
            'mode' => $visit->mode->value,
            'mode_label' => $visit->mode->shortLabel(),
            'notes' => $visit->notes,
            // Compte rendu post-visite ; `report_due` = visite passée, non annulée, sans compte rendu.
            'report' => $visit->report,
            'report_photos' => $visit->reportPhotoUrls(),
            'report_submitted_at' => $visit->report_submitted_at?->toIso8601String(),
            'report_author' => $visit->reportAuthor?->name,
            'report_due' => $visit->reportDue(),
            'client' => [
                'id' => $visit->lead->id,
                'uuid' => $visit->lead->uuid,
                'name' => $visit->lead->fullName(),
                'reference' => $visit->lead->reference,
                // Formule : dit qui réalise la visite (« Confié » = sans le client).
                'offer' => $visit->lead->offer?->value,
                'offer_label' => $visit->lead->offer?->label(),
            ],
            'property' => [
                'id' => $visit->property->id,
                'uuid' => $visit->property->uuid,
                'label' => $visit->property->label(),
                'street' => $visit->property->street,
                'postal_code' => $visit->property->postal_code,
                'city' => $visit->property->city,
                'district' => $visit->property->district,
                'latitude' => $visit->property->latitude,
                'longitude' => $visit->property->longitude,
                // Vignette de la liste : la première photo du bien, s'il en a une.
                'photo' => $visit->property->photoUrls()[0] ?? null,
                'rent_cents' => $visit->property->rent_cents,
                'currency' => $visit->property->currency->value,
            ],
            'agent' => $visit->agent === null ? null : [
                'id' => $visit->agent->id,
                'uuid' => $visit->agent->uuid,
                'name' => $visit->agent->fullName(),
                'agency' => $visit->agent->agency?->name,
            ],
            'assignee' => $visit->assignee === null ? null : [
                'id' => $visit->assignee->id,
                'name' => $visit->assignee->name,
                'avatar' => $visit->assignee->avatar,
            ],
            'creator' => $visit->creator?->name,
            'creator_avatar' => $visit->creator?->avatar,
        ];
    }
}
