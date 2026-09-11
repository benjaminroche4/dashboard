<?php

declare(strict_types=1);

namespace App\Http\Controllers\Properties;

use App\Actions\Properties\AssignPropertyToClient;
use App\Actions\Properties\CreateProperty;
use App\Actions\Properties\DeleteProperties;
use App\Actions\Properties\DeleteProperty;
use App\Actions\Properties\ExtractListing;
use App\Actions\Properties\FindNearbyTransit;
use App\Actions\Properties\RenderPropertyPdf;
use App\Actions\Properties\SetPropertyCover;
use App\Actions\Properties\SetPropertyStatus;
use App\Actions\Properties\UpdateProperty;
use App\Data\PropertyData;
use App\Enums\Currency;
use App\Enums\Furnished;
use App\Enums\LeaseType;
use App\Enums\Orientation;
use App\Enums\OwnerKind;
use App\Enums\PartnerType;
use App\Enums\PropertyAmenity;
use App\Enums\PropertyFloor;
use App\Enums\PropertyStatus;
use App\Enums\PropertyType;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Owners\OwnerController;
use App\Http\Requests\Properties\AssignPropertyRequest;
use App\Http\Requests\Properties\BulkPropertiesRequest;
use App\Http\Requests\Properties\ExtractListingRequest;
use App\Http\Requests\Properties\FindPropertyTransitRequest;
use App\Http\Requests\Properties\IndexPropertiesRequest;
use App\Http\Requests\Properties\SetPropertyCoverRequest;
use App\Http\Requests\Properties\SetPropertyStatusRequest;
use App\Http\Requests\Properties\StorePropertyRequest;
use App\Http\Requests\Properties\UpdatePropertyRequest;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\Lead;
use App\Models\Owner;
use App\Models\Partner;
use App\Models\Property;
use App\Models\Visit;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class PropertyController extends Controller
{
    use AuthorizesRequests;

    /** Biens par page de l'annuaire. */
    public const int PER_PAGE = 30;

    /** Annuaire des biens, du plus récent au plus ancien. */
    /** Annuaire des biens, paginé côté serveur : il peut en compter des milliers. */
    public function index(IndexPropertiesRequest $request): Response
    {
        $this->authorize('viewAny', Property::class);

        $search = $request->search();
        $statuses = $request->statuses();
        $sort = $request->sort();

        $paginator = Property::query()
            ->with(['agent.agency', 'owner', 'partner', 'creator'])
            ->withCount('visits')
            ->when($search !== '', fn (Builder $query): Builder => $query->where(fn (Builder $where): Builder => $where
                ->where('title', 'like', "%{$search}%")
                ->orWhere('street', 'like', "%{$search}%")
                ->orWhere('city', 'like', "%{$search}%")))
            ->when($statuses !== [], fn (Builder $query): Builder => $query->whereIn('status', $statuses))
            // `label` n'est pas une colonne : le titre, à défaut la rue.
            ->when($sort === 'label', fn (Builder $query): Builder => $query
                ->orderByRaw('coalesce(nullif(title, ?), street) '.$request->direction(), ['']))
            ->when($sort !== 'label', fn (Builder $query): Builder => $query->orderBy($sort, $request->direction()))
            ->orderByDesc('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        return Inertia::render('properties/index', [
            'properties' => $paginator->getCollection()
                ->map(fn (Property $property): array => self::summary($property))
                ->all(),
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
            'filters' => [
                'q' => $search,
                'status' => $statuses,
                'sort' => $sort,
                'dir' => $request->direction(),
            ],
            // Comptés sur tout l'annuaire, pas seulement la page affichée.
            'visitedCount' => Property::query()->has('visits')->count(),
            'statusCounts' => Property::query()
                ->selectRaw('status, count(*) as total')
                ->groupBy('status')
                ->pluck('total', 'status')
                ->all(),
            ...self::formOptions(),
            'realtimeOnly' => ['properties', 'pagination'],
        ]);
    }

    /** Attribue le bien à un client, ou le libère (`lead_id` vide). */
    public function assign(AssignPropertyRequest $request, Property $property, AssignPropertyToClient $assign): RedirectResponse
    {
        $this->authorize('update', $property);

        $leadId = $request->validated('lead_id');
        $lead = $leadId === null ? null : Lead::query()->whereKey($leadId)->first();

        $assign->handle($property, $lead, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => $lead === null
            ? __('Bien libéré : il est de nouveau proposable.')
            : __('Bien attribué à :client.', ['client' => $lead->householdName()])]);

        return back();
    }

    /**
     * Tous les biens situables, pour la carte de l'annuaire : la liste étant
     * paginée, la carte va chercher l'ensemble elle-même.
     */
    public function map(): JsonResponse
    {
        $this->authorize('viewAny', Property::class);

        return response()->json(Property::query()
            ->with('assignedLead')
            ->where(fn ($query) => $query
                ->whereNotNull('latitude')
                ->orWhereNotNull('district'))
            ->orderBy('id')
            ->get()
            ->map(fn (Property $property): array => [
                'uuid' => $property->uuid,
                'label' => $property->label(),
                'street' => $property->street,
                'postal_code' => $property->postal_code,
                'city' => $property->city,
                'district' => $property->district,
                'latitude' => $property->latitude,
                'longitude' => $property->longitude,
                'status' => $property->status->value,
                'status_label' => $property->status->label(),
                // La pastille verte de la carte suit « proposable », pas le statut seul.
                'is_available' => $property->isAvailable(),
                'assigned_to' => $property->assignedLead?->householdName(),
                'rent_cents' => $property->rent_cents,
                'currency' => $property->currency->value,
            ])
            ->all());
    }

    /** Recherche ⌘K : titre, rue, ville ou arrondissement (« 11 », « 11e »), huit résultats au plus. */
    public function search(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Property::class);

        $query = trim((string) $request->query('q', ''));

        if (mb_strlen($query) < 2) {
            return response()->json([]);
        }

        $district = preg_match('/^(\d{1,2})\s*(?:e|er|ème|eme)?$/iu', $query, $matches) === 1 ? (int) $matches[1] : null;

        return response()->json(Property::query()
            ->where(function ($builder) use ($query, $district): void {
                $builder->where('title', 'like', "%{$query}%")
                    ->orWhere('street', 'like', "%{$query}%")
                    ->orWhere('city', 'like', "%{$query}%")
                    ->when($district !== null && $district >= 1 && $district <= 20, fn ($builder) => $builder->orWhere('district', $district));
            })
            ->latest()
            ->limit(8)
            ->get()
            ->map(fn (Property $property): array => [
                'id' => $property->id,
                'uuid' => $property->uuid,
                'title' => $property->label(),
                'subtitle' => trim($property->street.', '.$property->postal_code.' '.$property->city, ', '),
                'url' => route('properties.show', $property),
            ])
            ->all());
    }

    /** Fiche d'un bien : caractéristiques, photos, propriétaire, agent, dossiers clients, visites. */
    public function show(Property $property): Response
    {
        $this->authorize('view', $property);

        $property->load(['agent.agency', 'owner.creator', 'partner', 'creator', 'leads' => fn ($query) => $query->orderByPivot('created_at', 'desc'), 'visits.lead', 'visits.agent.agency'])->loadCount('visits');

        return Inertia::render('properties/show', [
            'property' => self::summary($property),
            'owner' => $property->owner === null ? null : OwnerController::summary($property->owner),
            // Dossiers clients auxquels le bien a été attribué, le dernier rattachement d'abord.
            'clients' => $property->leads
                ->map(fn (Lead $lead): array => [
                    'id' => $lead->id,
                    'uuid' => $lead->uuid,
                    'name' => $lead->fullName(),
                    'reference' => $lead->reference,
                ])
                ->all(),
            'visits' => $property->visits
                ->sortByDesc('scheduled_at')
                ->values()
                ->map(fn (Visit $visit): array => [
                    'id' => $visit->id,
                    'uuid' => $visit->uuid,
                    'scheduled_at' => $visit->scheduled_at->toIso8601String(),
                    'status' => $visit->status->value,
                    'status_label' => $visit->status->label(),
                    'client' => ['uuid' => $visit->lead->uuid, 'name' => $visit->lead->fullName(), 'reference' => $visit->lead->reference],
                    'agent' => $visit->agent?->fullName(),
                ])
                ->all(),
            ...self::formOptions(),
        ]);
    }

    /** Page dédiée d'ajout d'un bien. */
    public function create(Request $request): Response
    {
        $this->authorize('create', Property::class);

        // ?owner=UUID : bien ajouté depuis la fiche d'un propriétaire, qui en détient plusieurs.
        $owner = $request->filled('owner')
            ? Owner::query()->where('uuid', (string) $request->query('owner'))->first()
            : null;

        return Inertia::render('properties/edit', [
            'property' => null,
            'defaultOwnerId' => $owner?->id,
            ...self::formOptions(),
        ]);
    }

    /** Page dédiée de modification d'un bien. */
    /** Fiche PDF du bien, à la charte des autres documents. */
    public function pdf(Property $property, RenderPropertyPdf $pdf): HttpResponse
    {
        $this->authorize('view', $property);

        $name = RenderPropertyPdf::fileName($property);

        return response($pdf->handle($property), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$name.'"',
        ]);
    }

    public function edit(Property $property): Response
    {
        $this->authorize('update', $property);

        $property->load(['agent.agency', 'owner', 'partner', 'creator'])->loadCount('visits');

        return Inertia::render('properties/edit', [
            'property' => self::summary($property),
            ...self::formOptions(),
        ]);
    }

    /**
     * Lit une annonce (URL ou texte) avec l'assistant IA et renvoie les champs du
     * formulaire préremplis : l'équipe relit avant d'enregistrer.
     */
    public function extract(ExtractListingRequest $request, ExtractListing $extract): JsonResponse
    {
        try {
            $result = $extract->handle((string) $request->validated('input'));
        } catch (\RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return response()->json([
            'property' => $result['property']->toForm(),
            'filled' => $result['property']->filledFields(),
            'highlights' => $result['property']->highlights,
            'agent_name' => $result['property']->agentName,
            'agency_name' => $result['property']->agencyName,
            'source' => $result['source'],
        ]);
    }

    /**
     * Transports proches de l'adresse saisie, proposés par l'assistant IA.
     * Rien n'est enregistré : l'équipe relit puis enregistre le bien.
     */
    public function transit(FindPropertyTransitRequest $request, FindNearbyTransit $find): JsonResponse
    {
        try {
            $transit = $find->handle($request->address());
        } catch (\RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return response()->json($transit->toArray());
    }

    public function store(StorePropertyRequest $request, CreateProperty $create): RedirectResponse
    {
        $this->authorize('create', Property::class);

        $property = $create->handle(PropertyData::from($request->validated()), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Bien :name ajouté.', ['name' => $property->label()])]);

        return to_route('properties.show', $property);
    }

    public function update(UpdatePropertyRequest $request, Property $property, UpdateProperty $update): RedirectResponse
    {
        $this->authorize('update', $property);

        $property = $update->handle($property, PropertyData::from($request->validated()));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Bien :name mis à jour.', ['name' => $property->label()])]);

        return to_route('properties.show', $property);
    }

    /** Suppression groupée depuis l'annuaire (admins). */
    public function bulkDestroy(BulkPropertiesRequest $request, DeleteProperties $deleteProperties): RedirectResponse
    {
        $this->authorize('delete', Property::class);

        $count = $deleteProperties->handle(Property::query()->whereIn('id', $request->ids())->get());

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':count bien(s) supprimé(s).', ['count' => $count])]);

        return back();
    }

    /** Change la disponibilité en un geste, depuis la fiche ou l'annuaire. */
    public function status(SetPropertyStatusRequest $request, Property $property, SetPropertyStatus $setStatus): RedirectResponse
    {
        $this->authorize('update', $property);

        $status = PropertyStatus::from((string) $request->validated('status'));
        $setStatus->handle($property, $status, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Bien :name : :status.', ['name' => $property->label(), 'status' => $status->label()])]);

        return back();
    }

    /** Choisit la photo principale : celle que montrent la carte et la fiche. */
    public function cover(SetPropertyCoverRequest $request, Property $property, SetPropertyCover $setCover): RedirectResponse
    {
        $this->authorize('update', $property);

        $setCover->handle($property, (int) $request->validated('index'), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Photo principale mise à jour.')]);

        return back();
    }

    public function destroy(Property $property, DeleteProperty $delete): RedirectResponse
    {
        $this->authorize('delete', $property);

        $label = $property->label();
        $delete->handle($property);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Bien :name supprimé.', ['name' => $label])]);

        return back();
    }

    /**
     * Listes du formulaire d'un bien (types, meublé, devises, agents, propriétaires), partagées avec les visites.
     *
     * @return array<string, mixed>
     */
    public static function formOptions(): array
    {
        return [
            'propertyTypes' => PropertyType::options(),
            'propertyStatuses' => PropertyStatus::options(),
            'furnishedOptions' => Furnished::options(),
            'leaseTypes' => LeaseType::options(),
            'floors' => PropertyFloor::options(),
            'orientations' => Orientation::options(),
            'amenities' => PropertyAmenity::options(),
            'currencies' => array_map(fn (Currency $currency): string => $currency->value, Currency::cases()),
            'agents' => Agent::query()->with('agency')->orderBy('last_name')->orderBy('first_name')->get()
                ->map(fn (Agent $agent): array => ['id' => $agent->id, 'name' => $agent->fullName(), 'agency' => $agent->agency?->name])
                ->all(),
            'owners' => Owner::query()->orderBy('last_name')->orderBy('first_name')->get()
                ->map(fn (Owner $owner): array => ['id' => $owner->id, 'name' => $owner->fullName()])
                ->all(),
            'partners' => Partner::query()->orderBy('name')->get()
                ->map(fn (Partner $partner): array => ['id' => $partner->id, 'name' => $partner->name, 'type' => $partner->type->label()])
                ->all(),
            'partnerTypes' => PartnerType::options(),
            // Pour les dialogues « Nouvel agent » et « Nouveau propriétaire »
            // ouverts depuis le formulaire d'un bien.
            'ownerKinds' => OwnerKind::options(),
            'agencies' => Agency::query()->orderBy('name')->get()
                ->map(fn (Agency $agency): array => ['id' => $agency->id, 'uuid' => $agency->uuid, 'name' => $agency->name])
                ->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function summary(Property $property): array
    {
        return [
            'id' => $property->id,
            'uuid' => $property->uuid,
            'title' => $property->title,
            'label' => $property->label(),
            'street' => $property->street,
            'postal_code' => $property->postal_code,
            'city' => $property->city,
            'district' => $property->district,
            'transit' => $property->transit ?? [],
            'status' => $property->status->value,
            'status_label' => $property->status->label(),
            'property_type' => $property->property_type?->value,
            'property_type_label' => $property->property_type?->label(),
            'furnished' => $property->furnished?->value,
            'furnished_label' => $property->furnished?->label(),
            'rooms' => $property->rooms,
            'bedrooms' => $property->bedrooms,
            'bathrooms' => $property->bathrooms,
            'surface_m2' => $property->surface_m2,
            'floor' => $property->floor?->value,
            'floor_label' => $property->floor?->label(),
            'building_floors' => $property->building_floors,
            'orientations' => $property->orientations ?? [],
            'orientation_labels' => array_map(fn (string $value): string => Orientation::from($value)->label(), $property->orientations ?? []),
            'amenities' => $property->amenities ?? [],
            'amenity_labels' => array_map(fn (string $value): string => PropertyAmenity::from($value)->label(), $property->amenities ?? []),
            'lease_type' => $property->lease_type?->value,
            'lease_type_label' => $property->lease_type?->label(),
            'rent_cents' => $property->rent_cents,
            'charges_cents' => $property->charges_cents,
            'charges_included' => $property->charges_included,
            'deposit_cents' => $property->deposit_cents,
            'currency' => $property->currency->value,
            'listing_url' => $property->listing_url,
            'agent' => $property->agent === null ? null : [
                'id' => $property->agent->id,
                'uuid' => $property->agent->uuid,
                'name' => $property->agent->fullName(),
                'agency' => $property->agent->agency?->name,
            ],
            'partner' => $property->partner === null ? null : [
                'id' => $property->partner->id,
                'uuid' => $property->partner->uuid,
                'name' => $property->partner->name,
                'type' => $property->partner->type->label(),
            ],
            'owner' => $property->owner === null ? null : [
                'id' => $property->owner->id,
                'uuid' => $property->owner->uuid,
                'name' => $property->owner->fullName(),
            ],
            'photos' => $property->photoUrls(),
            // Chemins sur le disque : le formulaire les renvoie pour dire lesquelles il garde.
            'photo_paths' => $property->photos ?? [],
            'notes' => $property->notes,
            // Bien attribué : il est pris, plus proposé en visite.
            'assigned_lead' => $property->assignedLead === null ? null : [
                'uuid' => $property->assignedLead->uuid,
                'name' => $property->assignedLead->householdName(),
            ],
            'assigned_at' => $property->assigned_at?->toIso8601String(),
            // Proposable : statut ouvert et aucun client dessus.
            'is_available' => $property->isAvailable(),
            'visits_count' => (int) ($property->visits_count ?? 0),
            'creator' => $property->creator?->name,
            'creator_avatar' => $property->creator?->avatar,
            'created_at' => $property->created_at?->toIso8601String(),
        ];
    }
}
