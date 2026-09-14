<?php

declare(strict_types=1);

namespace App\Http\Controllers\RealEstate;

use App\Actions\Agencies\UpdateAgentProfile;
use App\Actions\Directory\ToggleFavorite;
use App\Actions\Directory\TouchDirectoryContact;
use App\Actions\RealEstate\CreateAgent;
use App\Actions\RealEstate\DeleteAgent;
use App\Actions\RealEstate\DeleteAgents;
use App\Actions\RealEstate\UpdateAgent;
use App\Data\AgencyProfileData;
use App\Data\AgentData;
use App\Enums\AgencySpecialty;
use App\Enums\LeadStatus;
use App\Enums\SpokenLanguage;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Tools\ActivityController;
use App\Http\Requests\Agencies\UpdateAgentProfileRequest;
use App\Http\Requests\RealEstate\BulkAgentsRequest;
use App\Http\Requests\RealEstate\IndexAgentsRequest;
use App\Http\Requests\RealEstate\StoreAgentRequest;
use App\Http\Requests\RealEstate\TouchDirectoryRequest;
use App\Http\Requests\RealEstate\UpdateAgentRequest;
use App\Models\Activity;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\Lead;
use App\Services\DistrictStaticMap;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AgentController extends Controller
{
    use AuthorizesRequests;

    public function index(IndexAgentsRequest $request): Response
    {
        $this->authorize('viewAny', Agent::class);

        $user = $request->user();
        $search = $request->search();

        // L'annuaire peut compter des milliers d'agents : une page à la fois,
        // filtrée et triée par la base. L'ordre ne dépend pas des favoris,
        // sinon une étoile ferait sauter la ligne sous le curseur.
        $paginator = Agent::query()
            ->with(['agency', 'creator', 'leads'])
            ->withCount('visits')
            ->withMax('visits', 'scheduled_at')
            ->withFavoriteOf($user)
            ->when($search !== '', fn (Builder $query): Builder => $query->where(fn (Builder $where): Builder => $where
                ->whereRaw("first_name || ' ' || last_name like ?", ["%{$search}%"])
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%")
                ->orWhere('city', 'like', "%{$search}%")
                ->orWhereHas('agency', fn (Builder $agency): Builder => $agency->where('name', 'like', "%{$search}%"))))
            ->when($request->favoritesOnly(), fn (Builder $query): Builder => $query->whereHas('favorites', fn (Builder $favorites): Builder => $favorites->where('user_id', $user?->id)))
            ->tap(fn (Builder $query) => $this->sortAgents($query, $request->sort(), $request->direction()))
            ->paginate(IndexAgentsRequest::PER_PAGE)
            ->withQueryString();

        return Inertia::render('real-estate/agents', [
            'agents' => $paginator->getCollection()->map(fn (Agent $agent): array => self::summary($agent))->all(),
            'agencies' => $this->agencyOptions(),
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
            'filters' => $request->filters(),
            // Compteur du bouton « Favoris », indépendant de la page affichée.
            'favoritesCount' => $user === null ? 0 : Agent::query()->whereHas('favorites', fn (Builder $favorites): Builder => $favorites->where('user_id', $user->id))->count(),
        ]);
    }

    /**
     * @param  Builder<Agent>  $query
     * @param  'asc'|'desc'  $direction
     */
    private function sortAgents(Builder $query, string $sort, string $direction): void
    {
        match ($sort) {
            'city' => $query->orderBy('city', $direction)->orderBy('last_name'),
            'created_at' => $query->orderBy('created_at', $direction),
            'favorite' => $query->orderBy('is_favorite', $direction)->orderBy('last_name'),
            default => $query->orderBy('last_name', $direction)->orderBy('first_name', $direction),
        };

        $query->orderBy('id');
    }

    /**
     * Adresse de l'agent sur une ligne, pour la carte statique : la sienne
     * s'il est indépendant, celle de son agence sinon — un agent rattaché
     * travaille à l'adresse de son agence et n'en porte pas d'autre.
     */
    private function addressLine(Agent $agent): ?string
    {
        $place = $agent->agency ?? $agent;

        $line = trim(implode(', ', array_filter([
            $place->street,
            trim(($place->postal_code ?? '').' '.($place->city ?? '')),
        ])));

        return $line === '' ? null : $line;
    }

    public function show(Request $request, Agent $agent): Response
    {
        $this->authorize('view', $agent);

        $agent->load(['agency.agents', 'creator', 'leads'])
            ->loadCount('visits')
            ->loadMax('visits', 'scheduled_at')
            ->loadFavoriteOf($request->user());

        // L'adresse d'un agent rattaché est celle de son agence ; seul un
        // indépendant a la sienne.
        $place = $agent->agency ?? $agent;

        return Inertia::render('real-estate/agent', [
            // Carte statique de l'adresse, comme sur les fiches partenaire,
            // agence et propriétaire (clé Maps Static dédiée).
            'mapUrl' => resolve(DistrictStaticMap::class)->place(
                $place->latitude,
                $place->longitude,
                $this->addressLine($agent),
            ),
            'agent' => [
                ...self::summary($agent),
                // Profil de matching propre à l'agent ; à défaut, celui de son agence sert.
                'districts' => array_map(intval(...), $agent->districts ?? []),
                'specialties' => $agent->specialties?->map(fn (AgencySpecialty $s): string => $s->value)->values()->all() ?? [],
                'specialty_labels' => $agent->specialties?->map(fn (AgencySpecialty $s): string => $s->label())->values()->all() ?? [],
                'languages' => $agent->languages?->map(fn (SpokenLanguage $l): string => $l->value)->values()->all() ?? [],
                'language_labels' => $agent->languages?->map(fn (SpokenLanguage $l): string => $l->label())->values()->all() ?? [],
            ],
            'profileOptions' => AgencyController::profileOptions(),
            // Fiche de son agence, pour la carte « Agence » de la page.
            'agency' => $agent->agency === null ? null : [
                'id' => $agent->agency->id,
                'uuid' => $agent->agency->uuid,
                'name' => $agent->agency->name,
                'street' => $agent->agency->street,
                'postal_code' => $agent->agency->postal_code,
                'city' => $agent->agency->city,
                // Position de l'agence : c'est l'adresse de ses agents rattachés,
                // donc celle que montre la carte de leur fiche.
                'latitude' => $agent->agency->latitude,
                'longitude' => $agent->agency->longitude,
                'phone' => $agent->agency->phone,
                'email' => $agent->agency->email,
                'website' => $agent->agency->website,
                'agents_count' => $agent->agency->agents->count(),
            ],
            'agencies' => $this->agencyOptions(),
            // Journal : les dernières actions du backoffice sur cette fiche.
            'activities' => Activity::query()
                ->with(['actor', 'lead', 'partner'])
                ->where('agent_id', $agent->id)
                ->latest('created_at')
                ->latest('id')
                ->limit(10)
                ->get()
                ->map(fn (Activity $activity): array => ActivityController::summary($activity))
                ->all(),
        ]);
    }

    /** Profil de matching propre à l'agent (quartiers, spécialités, langues). */
    public function profile(UpdateAgentProfileRequest $request, Agent $agent, UpdateAgentProfile $update): RedirectResponse
    {
        $this->authorize('update', $agent);

        $update->handle($agent, AgencyProfileData::from($request->validated()), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Profil de :name enregistré.', ['name' => $agent->fullName()])]);

        return back();
    }

    /**
     * @return array<int, array{id: int, uuid: string, name: string, address: string|null}>
     */
    private function agencyOptions(): array
    {
        return Agency::query()
            ->orderBy('name')
            ->get()
            ->map(fn (Agency $agency): array => AgencyController::option($agency))
            ->all();
    }

    /**
     * Agent dans un sélecteur (carte « Agent en contact » d'un lead ou d'un
     * dossier) : nom, agence, téléphone et l'étoile du membre connecté.
     *
     * @return array{id: int, uuid: string, name: string, agency: string|null, phone: string|null, is_favorite: bool}
     */
    public static function option(Agent $agent): array
    {
        return [
            'id' => $agent->id,
            'uuid' => $agent->uuid,
            'name' => $agent->fullName(),
            'agency' => $agent->agency?->name,
            'phone' => $agent->phone,
            'is_favorite' => (bool) $agent->is_favorite,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function summary(Agent $agent): array
    {
        return [
            'id' => $agent->id,
            'uuid' => $agent->uuid,
            'first_name' => $agent->first_name,
            'last_name' => $agent->last_name,
            'name' => $agent->fullName(),
            'is_primary' => $agent->is_primary,
            // Visites faites avec cet agent : combien, et la plus récente.
            'visits_count' => (int) ($agent->visits_count ?? 0),
            'last_visit_at' => $agent->visits_max_scheduled_at === null
                ? null
                : CarbonImmutable::parse((string) $agent->visits_max_scheduled_at)->toIso8601String(),
            'position' => $agent->position?->label(),
            'relationship_quality' => $agent->relationship_quality?->value,
            'relationship_quality_label' => $agent->relationship_quality?->label(),
            'position_value' => $agent->position?->value,
            'street' => $agent->street,
            'postal_code' => $agent->postal_code,
            'city' => $agent->city,
            'last_contacted_at' => $agent->last_contacted_at?->toIso8601String(),
            'latitude' => $agent->latitude,
            'longitude' => $agent->longitude,
            'email' => $agent->email,
            'phone' => $agent->phone,
            'notes' => $agent->notes,
            'is_favorite' => (bool) $agent->is_favorite,
            // L'agence porte son adresse : c'est celle d'un agent rattaché,
            // que la liste et la fiche affichent à la place de la sienne.
            'agency' => $agent->agency === null ? null : AgencyController::option($agent->agency),
            // Leads dont il est le contact, du plus récent au plus ancien. Un lead
            // converti est un dossier client : il se lit sous le nom du foyer et son
            // lien mène au dossier, pas à la fiche lead.
            'leads' => $agent->leads->map(fn (Lead $lead): array => [
                'uuid' => $lead->uuid,
                'name' => $lead->status === LeadStatus::Converted ? $lead->householdName() : $lead->fullName(),
                'status_label' => $lead->status->label(),
                'is_client' => $lead->status === LeadStatus::Converted,
            ])->all(),
            'creator' => $agent->creator?->name,
            'creator_avatar' => $agent->creator?->avatar,
            'created_at' => $agent->created_at?->toIso8601String(),
        ];
    }

    /** Agents partageant l'e-mail ou le téléphone saisis (hors `except`), pour l'alerte doublons. */
    public function duplicates(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Agent::class);

        $except = (int) $request->query('except', 0);

        return response()->json(Agent::query()
            ->with('agency')
            ->matchingContact((string) $request->query('email', ''), (string) $request->query('phone', ''))
            ->when($except > 0, fn ($query) => $query->whereKeyNot($except))
            ->orderBy('last_name')
            ->limit(5)
            ->get()
            ->map(fn (Agent $agent): array => [
                'id' => $agent->id,
                'uuid' => $agent->uuid,
                'name' => $agent->fullName(),
                'agency' => $agent->agency?->name,
                'email' => $agent->email,
                'phone' => $agent->phone,
            ])
            ->all());
    }

    public function touch(TouchDirectoryRequest $request, Agent $agent, TouchDirectoryContact $touch): RedirectResponse
    {
        $this->authorize('update', $agent);

        $at = $request->validated('at');
        $touch->handle($agent, is_string($at) ? CarbonImmutable::parse($at) : null, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Échange noté.')]);

        return back();
    }

    /** Recherche ⌘K : nom de l'agent, agence, e-mail ou téléphone. */
    public function search(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Agent::class);

        $query = trim((string) $request->query('q', ''));

        if (mb_strlen($query) < 2) {
            return response()->json([]);
        }

        return response()->json(Agent::query()
            ->with('agency')
            ->where(function (Builder $builder) use ($query): void {
                $builder->whereRaw("first_name || ' ' || last_name like ?", ["%{$query}%"])
                    ->orWhere('email', 'like', "%{$query}%")
                    ->orWhere('phone', 'like', "%{$query}%")
                    ->orWhereHas('agency', fn (Builder $agency) => $agency->where('name', 'like', "%{$query}%"));
            })
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->limit(8)
            ->get()
            ->map(fn (Agent $agent): array => [
                'id' => $agent->id,
                'uuid' => $agent->uuid,
                'title' => $agent->fullName(),
                'subtitle' => implode(' · ', array_filter([$agent->agency?->name, $agent->position?->label()])) ?: null,
                'url' => route('agents.show', $agent),
            ])
            ->all());
    }

    /** Pose ou retire l'étoile du membre connecté sur cet agent (favori personnel). */
    public function favorite(Request $request, Agent $agent, ToggleFavorite $toggle): RedirectResponse
    {
        $this->authorize('view', $agent);

        $toggle->handle($request->user(), $agent);

        return back();
    }

    public function store(StoreAgentRequest $request, CreateAgent $create): RedirectResponse
    {
        $this->authorize('create', Agent::class);

        $notify = $request->boolean('notify');
        $agent = $create->handle(AgentData::from($request->validated()), $request->user(), $notify);

        $message = $notify && $agent->email !== null
            ? __('Agent :name ajouté, e-mail de bienvenue envoyé.', ['name' => $agent->fullName()])
            : __('Agent :name ajouté.', ['name' => $agent->fullName()]);
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return back();
    }

    public function update(UpdateAgentRequest $request, Agent $agent, UpdateAgent $update): RedirectResponse
    {
        $this->authorize('update', $agent);

        $agent = $update->handle($agent, AgentData::from($request->validated()));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Agent :name mis à jour.', ['name' => $agent->fullName()])]);

        return back();
    }

    /** Suppression groupée depuis la liste (admins). */
    public function bulkDestroy(BulkAgentsRequest $request, DeleteAgents $deleteAgents): RedirectResponse
    {
        $this->authorize('delete', Agent::class);

        $count = $deleteAgents->handle(Agent::query()->whereIn('id', $request->ids())->get());

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':count agent(s) supprimé(s).', ['count' => $count])]);

        return back();
    }

    public function destroy(Agent $agent, DeleteAgent $delete): RedirectResponse
    {
        $this->authorize('delete', $agent);

        $name = $agent->fullName();
        $delete->handle($agent);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Agent :name supprimé.', ['name' => $name])]);

        return back();
    }
}
