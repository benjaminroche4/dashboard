<?php

declare(strict_types=1);

namespace App\Http\Controllers\Properties;

use App\Actions\Properties\CreateProperty;
use App\Actions\Properties\DeleteProperty;
use App\Actions\Properties\ExtractListing;
use App\Actions\Properties\UpdateProperty;
use App\Data\PropertyData;
use App\Enums\Currency;
use App\Enums\Furnished;
use App\Enums\LeaseType;
use App\Enums\PropertyType;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Owners\OwnerController;
use App\Http\Requests\Properties\ExtractListingRequest;
use App\Http\Requests\Properties\StorePropertyRequest;
use App\Http\Requests\Properties\UpdatePropertyRequest;
use App\Models\Agent;
use App\Models\Owner;
use App\Models\Property;
use App\Models\Visit;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PropertyController extends Controller
{
    use AuthorizesRequests;

    /** Annuaire des biens, du plus récent au plus ancien. */
    public function index(): Response
    {
        $this->authorize('viewAny', Property::class);

        $properties = Property::query()
            ->with(['agent.agency', 'owner', 'creator'])
            ->withCount('visits')
            ->latest()
            ->get()
            ->map(fn (Property $property): array => self::summary($property))
            ->all();

        return Inertia::render('properties/index', [
            'properties' => $properties,
            ...self::formOptions(),
            'realtimeOnly' => ['properties'],
        ]);
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

    /** Fiche d'un bien : caractéristiques, photos, propriétaire, agent, visites. */
    public function show(Property $property): Response
    {
        $this->authorize('view', $property);

        $property->load(['agent.agency', 'owner.creator', 'owner.lead', 'creator', 'visits.lead', 'visits.agent.agency'])->loadCount('visits');

        return Inertia::render('properties/show', [
            'property' => self::summary($property),
            'owner' => $property->owner === null ? null : OwnerController::summary($property->owner),
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
    public function create(): Response
    {
        $this->authorize('create', Property::class);

        return Inertia::render('properties/edit', [
            'property' => null,
            ...self::formOptions(),
        ]);
    }

    /** Page dédiée de modification d'un bien. */
    public function edit(Property $property): Response
    {
        $this->authorize('update', $property);

        $property->load(['agent.agency', 'owner', 'creator'])->loadCount('visits');

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
            'furnishedOptions' => Furnished::options(),
            'leaseTypes' => LeaseType::options(),
            'currencies' => array_map(fn (Currency $currency): string => $currency->value, Currency::cases()),
            'agents' => Agent::query()->with('agency')->orderBy('last_name')->orderBy('first_name')->get()
                ->map(fn (Agent $agent): array => ['id' => $agent->id, 'name' => $agent->fullName(), 'agency' => $agent->agency?->name])
                ->all(),
            'owners' => Owner::query()->orderBy('last_name')->orderBy('first_name')->get()
                ->map(fn (Owner $owner): array => ['id' => $owner->id, 'name' => $owner->fullName()])
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
            'property_type' => $property->property_type?->value,
            'property_type_label' => $property->property_type?->label(),
            'furnished' => $property->furnished?->value,
            'furnished_label' => $property->furnished?->label(),
            'rooms' => $property->rooms,
            'surface_m2' => $property->surface_m2,
            'floor' => $property->floor,
            'lease_type' => $property->lease_type?->value,
            'lease_type_label' => $property->lease_type?->label(),
            'rent_cents' => $property->rent_cents,
            'charges_cents' => $property->charges_cents,
            'currency' => $property->currency->value,
            'listing_url' => $property->listing_url,
            'agent' => $property->agent === null ? null : [
                'id' => $property->agent->id,
                'uuid' => $property->agent->uuid,
                'name' => $property->agent->fullName(),
                'agency' => $property->agent->agency?->name,
            ],
            'owner' => $property->owner === null ? null : [
                'id' => $property->owner->id,
                'uuid' => $property->owner->uuid,
                'name' => $property->owner->fullName(),
            ],
            'photos' => $property->photoUrls(),
            'notes' => $property->notes,
            'visits_count' => (int) ($property->visits_count ?? 0),
            'creator' => $property->creator?->name,
            'creator_avatar' => $property->creator?->avatar,
            'created_at' => $property->created_at?->toIso8601String(),
        ];
    }
}
