<?php

declare(strict_types=1);

namespace App\Http\Controllers\Clients;

use App\Actions\Visits\DeleteVisit;
use App\Actions\Visits\ScheduleVisit;
use App\Actions\Visits\SubmitVisitReport;
use App\Actions\Visits\UpdateVisit;
use App\Data\VisitData;
use App\Enums\LeadStatus;
use App\Enums\VisitStatus;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Properties\PropertyController;
use App\Http\Requests\Visits\StoreVisitReportRequest;
use App\Http\Requests\Visits\StoreVisitRequest;
use App\Http\Requests\Visits\UpdateVisitRequest;
use App\Models\Lead;
use App\Models\Property;
use App\Models\Visit;
use Carbon\CarbonImmutable;
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

        return Inertia::render('clients/visits', [
            'visits' => $visits,
            'statuses' => VisitStatus::options(),
            ...$this->scheduleOptions(),
            'realtimeOnly' => ['visits', 'properties'],
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
                ->map(fn (Lead $lead): array => ['id' => $lead->id, 'uuid' => $lead->uuid, 'name' => $lead->fullName(), 'reference' => $lead->reference])
                ->all(),
            'properties' => Property::query()->latest()->get()
                ->map(fn (Property $property): array => ['id' => $property->id, 'label' => $property->label(), 'street' => $property->street, 'postal_code' => $property->postal_code, 'city' => $property->city, 'photo' => $property->photoUrls()[0] ?? null])
                ->all(),
            ...PropertyController::formOptions(),
        ];
    }

    public function update(UpdateVisitRequest $request, Visit $visit, UpdateVisit $update): RedirectResponse
    {
        $this->authorize('update', $visit);

        $status = $request->validated('status');
        $scheduledAt = $request->validated('scheduled_at');
        $notes = $request->validated('notes');

        $visit = $update->handle(
            $visit,
            is_string($status) ? VisitStatus::from($status) : null,
            is_string($scheduledAt) ? CarbonImmutable::parse($scheduledAt, config('app.timezone')) : null,
            is_string($notes) ? $notes : null,
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Visite :status.', ['status' => mb_strtolower($visit->status->label())])]);

        return back();
    }

    /** Compte rendu rédigé après la visite. */
    public function report(StoreVisitReportRequest $request, Visit $visit, SubmitVisitReport $submit): RedirectResponse
    {
        $this->authorize('update', $visit);

        $visit = $submit->handle($visit, (string) $request->validated('report'), $request->user());

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
            'notes' => $visit->notes,
            // Compte rendu post-visite ; `report_due` = visite passée, non annulée, sans compte rendu.
            'report' => $visit->report,
            'report_submitted_at' => $visit->report_submitted_at?->toIso8601String(),
            'report_author' => $visit->reportAuthor?->name,
            'report_due' => $visit->reportDue(),
            'client' => [
                'id' => $visit->lead->id,
                'uuid' => $visit->lead->uuid,
                'name' => $visit->lead->fullName(),
                'reference' => $visit->lead->reference,
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
