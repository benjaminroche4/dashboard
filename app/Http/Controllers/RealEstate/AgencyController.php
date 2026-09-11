<?php

declare(strict_types=1);

namespace App\Http\Controllers\RealEstate;

use App\Actions\Directory\ToggleFavorite;
use App\Actions\Directory\TouchDirectoryContact;
use App\Actions\RealEstate\CreateAgency;
use App\Actions\RealEstate\DeleteAgencies;
use App\Actions\RealEstate\DeleteAgency;
use App\Actions\RealEstate\ImportAgencies;
use App\Actions\RealEstate\UpdateAgency;
use App\Data\AgencyData;
use App\Data\AgencyImportRowData;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Tools\ActivityController;
use App\Http\Requests\RealEstate\BulkAgenciesRequest;
use App\Http\Requests\RealEstate\ImportAgenciesRequest;
use App\Http\Requests\RealEstate\IndexAgenciesRequest;
use App\Http\Requests\RealEstate\StoreAgencyRequest;
use App\Http\Requests\RealEstate\TouchDirectoryRequest;
use App\Http\Requests\RealEstate\UpdateAgencyRequest;
use App\Models\Activity;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\Visit;
use App\Services\DistrictStaticMap;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AgencyController extends Controller
{
    use AuthorizesRequests;

    public function index(IndexAgenciesRequest $request): Response
    {
        $this->authorize('viewAny', Agency::class);

        $user = $request->user();
        $search = $request->search();

        // Annuaire volumineux : une page à la fois. L'ordre ne dépend pas des
        // favoris, pour qu'une étoile ne fasse pas sauter la ligne.
        $paginator = Agency::query()
            ->with(['creator', 'agents'])
            ->withCount('agents')
            ->withFavoriteOf($user)
            ->when($search !== '', fn (Builder $query): Builder => $query->where(fn (Builder $where): Builder => $where
                ->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%")
                ->orWhere('city', 'like', "%{$search}%")))
            ->when($request->favoritesOnly(), fn (Builder $query): Builder => $query->whereHas('favorites', fn (Builder $favorites): Builder => $favorites->where('user_id', $user?->id)))
            ->tap(fn (Builder $query) => $this->sortAgencies($query, $request->sort(), $request->direction()))
            ->paginate(IndexAgenciesRequest::PER_PAGE)
            ->withQueryString();

        return Inertia::render('real-estate/agencies', [
            'agencies' => $paginator->getCollection()->map(fn (Agency $agency): array => self::summary($agency))->all(),
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
            'filters' => $request->filters(),
            // Sélecteur d'agence du dialogue « Nouvel agent » : toutes les agences, pas seulement la page.
            'agencyOptions' => Agency::query()->orderBy('name')->get(['id', 'uuid', 'name'])
                ->map(fn (Agency $agency): array => ['id' => $agency->id, 'uuid' => $agency->uuid, 'name' => $agency->name])
                ->all(),
            'favoritesCount' => $user === null ? 0 : Agency::query()->whereHas('favorites', fn (Builder $favorites): Builder => $favorites->where('user_id', $user->id))->count(),
        ]);
    }

    /**
     * @param  Builder<Agency>  $query
     * @param  'asc'|'desc'  $direction
     */
    private function sortAgencies(Builder $query, string $sort, string $direction): void
    {
        match ($sort) {
            'city' => $query->orderBy('city', $direction)->orderBy('name'),
            'agents' => $query->orderBy('agents_count', $direction)->orderBy('name'),
            'created_at' => $query->orderBy('created_at', $direction),
            'favorite' => $query->orderBy('is_favorite', $direction)->orderBy('name'),
            default => $query->orderBy('name', $direction),
        };

        $query->orderBy('id');
    }

    public function show(Request $request, Agency $agency): Response
    {
        $this->authorize('view', $agency);

        $agency->load(['creator', 'agents.leads', 'visits.property', 'visits.agent'])->loadFavoriteOf($request->user());
        $agency->loadCount('agents');

        return Inertia::render('real-estate/agency', [
            // Carte statique de l'adresse, si la clé Maps Static dédiée est configurée.
            'mapUrl' => resolve(DistrictStaticMap::class)->place($agency->latitude, $agency->longitude, $this->addressLine($agency)),
            'agency' => [
                ...self::summary($agency),
                'agents' => $agency->agents->map(fn (Agent $agent): array => [
                    'id' => $agent->id,
                    'uuid' => $agent->uuid,
                    'name' => $agent->fullName(),
                    'is_primary' => $agent->is_primary,
                    'position' => $agent->position?->label(),
                    'phone' => $agent->phone,
                    'email' => $agent->email,
                    'leads_count' => $agent->leads->count(),
                ])->all(),
                // Biens visités avec l'un des agents de l'agence, le plus récent d'abord.
                'properties' => $this->visitedProperties($agency),
            ],
            // Journal : les dernières actions du backoffice sur cette fiche.
            'activities' => Activity::query()
                ->with(['actor', 'lead', 'partner'])
                ->where('agency_id', $agency->id)
                ->latest('created_at')
                ->latest('id')
                ->limit(10)
                ->get()
                ->map(fn (Activity $activity): array => ActivityController::summary($activity))
                ->all(),
        ]);
    }

    /**
     * Biens visités avec cette agence : une ligne par bien, avec le nombre de
     * visites et la date de la dernière.
     *
     * @return list<array<string, mixed>>
     */
    private function visitedProperties(Agency $agency): array
    {
        $rows = [];

        foreach ($agency->visits->groupBy('property_id') as $visits) {
            /** @var Visit $last */
            $last = $visits->first();

            $rows[] = [
                'uuid' => $last->property->uuid,
                'label' => $last->property->label(),
                'visits_count' => $visits->count(),
                'last_visit_at' => $last->scheduled_at->toIso8601String(),
                'last_visit_status' => $last->status->label(),
                'agent' => $last->agent?->fullName(),
            ];
        }

        return $rows;
    }

    /** Agences partageant l'e-mail ou le téléphone saisis (hors `except`), pour l'alerte doublons. */
    public function duplicates(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Agency::class);

        $except = (int) $request->query('except', 0);

        return response()->json(Agency::query()
            ->matchingContact((string) $request->query('email', ''), (string) $request->query('phone', ''))
            ->when($except > 0, fn ($query) => $query->whereKeyNot($except))
            ->orderBy('name')
            ->limit(5)
            ->get()
            ->map(fn (Agency $agency): array => ['id' => $agency->id, 'uuid' => $agency->uuid, 'name' => $agency->name, 'email' => $agency->email, 'phone' => $agency->phone])
            ->all());
    }

    /** Note un échange avec cette agence. */
    public function touch(TouchDirectoryRequest $request, Agency $agency, TouchDirectoryContact $touch): RedirectResponse
    {
        $this->authorize('update', $agency);

        $at = $request->validated('at');
        $touch->handle($agency, is_string($at) ? CarbonImmutable::parse($at) : null, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Échange noté.')]);

        return back();
    }

    /** Import d'agences collées depuis un tableur. */
    public function import(ImportAgenciesRequest $request, ImportAgencies $import): RedirectResponse
    {
        $this->authorize('create', Agency::class);

        /** @var list<array<string, mixed>> $rows */
        $rows = $request->validated('rows');
        $result = $import->handle(array_map(AgencyImportRowData::from(...), $rows), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':created agence(s) importée(s), :skipped ignorée(s) car déjà présente(s).', [
            'created' => $result['created'],
            'skipped' => $result['skipped'],
        ])]);

        return back();
    }

    /** Recherche ⌘K : nom de l'agence, e-mail, téléphone ou ville. */
    public function search(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Agency::class);

        $query = trim((string) $request->query('q', ''));

        if (mb_strlen($query) < 2) {
            return response()->json([]);
        }

        return response()->json(Agency::query()
            ->withCount('agents')
            ->where(function (Builder $builder) use ($query): void {
                $builder->where('name', 'like', "%{$query}%")
                    ->orWhere('email', 'like', "%{$query}%")
                    ->orWhere('phone', 'like', "%{$query}%")
                    ->orWhere('city', 'like', "%{$query}%");
            })
            ->orderBy('name')
            ->limit(8)
            ->get()
            ->map(fn (Agency $agency): array => [
                'id' => $agency->id,
                'uuid' => $agency->uuid,
                'title' => $agency->name,
                'subtitle' => implode(' · ', array_filter([
                    $agency->city,
                    $agency->agents_count > 0 ? "{$agency->agents_count} agent(s)" : null,
                ])) ?: null,
                'url' => route('agencies.show', $agency),
            ])
            ->all());
    }

    /** Pose ou retire l'étoile du membre connecté sur cette agence (favori personnel). */
    public function favorite(Request $request, Agency $agency, ToggleFavorite $toggle): RedirectResponse
    {
        $this->authorize('view', $agency);

        $toggle->handle($request->user(), $agency);

        return back();
    }

    public function store(StoreAgencyRequest $request, CreateAgency $create): RedirectResponse
    {
        $this->authorize('create', Agency::class);

        $notify = $request->boolean('notify');
        $agency = $create->handle(AgencyData::from($request->validated()), $request->user(), $notify);

        $message = $notify && $agency->email !== null
            ? __('Agence :name ajoutée, e-mail de bienvenue envoyé.', ['name' => $agency->name])
            : __('Agence :name ajoutée.', ['name' => $agency->name]);
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return back();
    }

    public function update(UpdateAgencyRequest $request, Agency $agency, UpdateAgency $update): RedirectResponse
    {
        $this->authorize('update', $agency);

        $agency = $update->handle($agency, AgencyData::from($request->validated()));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Agence :name mise à jour.', ['name' => $agency->name])]);

        return back();
    }

    /** Suppression groupée depuis la liste (admins). */
    public function bulkDestroy(BulkAgenciesRequest $request, DeleteAgencies $deleteAgencies): RedirectResponse
    {
        $this->authorize('delete', Agency::class);

        $count = $deleteAgencies->handle(Agency::query()->whereIn('id', $request->ids())->get());

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':count agence(s) supprimée(s).', ['count' => $count])]);

        return back();
    }

    public function destroy(Agency $agency, DeleteAgency $delete): RedirectResponse
    {
        $this->authorize('delete', $agency);

        $name = $agency->name;
        $delete->handle($agency);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Agence :name supprimée.', ['name' => $name])]);

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    public static function summary(Agency $agency): array
    {
        return [
            'id' => $agency->id,
            'uuid' => $agency->uuid,
            'name' => $agency->name,
            'street' => $agency->street,
            'postal_code' => $agency->postal_code,
            'city' => $agency->city,
            'last_contacted_at' => $agency->last_contacted_at?->toIso8601String(),
            'latitude' => $agency->latitude,
            'longitude' => $agency->longitude,
            'phone' => $agency->phone,
            'email' => $agency->email,
            'website' => $agency->website,
            'notes' => $agency->notes,
            'is_favorite' => (bool) $agency->is_favorite,
            'agents_count' => (int) ($agency->agents_count ?? 0),
            'agents' => $agency->agents->map(fn (Agent $agent): array => [
                'id' => $agent->id,
                'uuid' => $agent->uuid,
                'name' => $agent->fullName(),
                'is_primary' => $agent->is_primary,
                'position' => $agent->position?->label(),
                'phone' => $agent->phone,
                'email' => $agent->email,
            ])->all(),
            'creator' => $agency->creator?->name,
            'creator_avatar' => $agency->creator?->avatar,
            'created_at' => $agency->created_at?->toIso8601String(),
        ];
    }

    /** Adresse de l'agence sur une ligne, pour la carte statique. */
    private function addressLine(Agency $agency): ?string
    {
        $line = trim(implode(', ', array_filter([
            $agency->street,
            trim(($agency->postal_code ?? '').' '.($agency->city ?? '')),
        ])));

        return $line === '' ? null : $line;
    }
}
