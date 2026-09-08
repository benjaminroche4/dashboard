<?php

declare(strict_types=1);

namespace App\Http\Controllers\RealEstate;

use App\Actions\RealEstate\CreateAgency;
use App\Actions\RealEstate\DeleteAgency;
use App\Actions\RealEstate\ToggleFavorite;
use App\Actions\RealEstate\UpdateAgency;
use App\Data\AgencyData;
use App\Http\Controllers\Controller;
use App\Http\Requests\RealEstate\StoreAgencyRequest;
use App\Http\Requests\RealEstate\UpdateAgencyRequest;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\Lead;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AgencyController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Agency::class);

        // Les favoris du membre connecté d'abord, puis l'ordre alphabétique.
        $agencies = Agency::query()
            ->with(['creator', 'agents'])
            ->withCount('agents')
            ->withFavoriteOf($request->user())
            ->orderByDesc('is_favorite')
            ->orderBy('name')
            ->get()
            ->map(fn (Agency $agency): array => self::summary($agency))
            ->all();

        return Inertia::render('real-estate/agencies', ['agencies' => $agencies]);
    }

    public function show(Request $request, Agency $agency): Response
    {
        $this->authorize('view', $agency);

        $agency->load(['creator', 'agents.leads', 'leads.agent'])->loadFavoriteOf($request->user());
        $agency->loadCount('agents');

        return Inertia::render('real-estate/agency', [
            'agency' => [
                ...self::summary($agency),
                'agents' => $agency->agents->map(fn (Agent $agent): array => [
                    'id' => $agent->id,
                    'uuid' => $agent->uuid,
                    'name' => $agent->fullName(),
                    'position' => $agent->position?->label(),
                    'phone' => $agent->phone,
                    'email' => $agent->email,
                    'leads_count' => $agent->leads->count(),
                ])->all(),
                // Leads en contact avec l'un des agents, du plus récent au plus ancien.
                'leads' => $agency->leads->map(fn (Lead $lead): array => [
                    'uuid' => $lead->uuid,
                    'name' => $lead->fullName(),
                    'status_label' => $lead->status->label(),
                    'agent' => $lead->agent?->fullName(),
                ])->all(),
            ],
        ]);
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
                'position' => $agent->position?->label(),
                'phone' => $agent->phone,
                'email' => $agent->email,
            ])->all(),
            'creator' => $agency->creator?->name,
            'creator_avatar' => $agency->creator?->avatar,
            'created_at' => $agency->created_at?->toIso8601String(),
        ];
    }
}
