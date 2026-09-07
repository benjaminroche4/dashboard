<?php

declare(strict_types=1);

namespace App\Http\Controllers\RealEstate;

use App\Actions\RealEstate\CreateAgent;
use App\Actions\RealEstate\DeleteAgent;
use App\Actions\RealEstate\ImportAgents;
use App\Actions\RealEstate\UpdateAgent;
use App\Data\AgentData;
use App\Data\AgentImportRowData;
use App\Http\Controllers\Controller;
use App\Http\Requests\RealEstate\ImportAgentsRequest;
use App\Http\Requests\RealEstate\StoreAgentRequest;
use App\Http\Requests\RealEstate\UpdateAgentRequest;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\Lead;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AgentController extends Controller
{
    use AuthorizesRequests;

    public function index(): Response
    {
        $this->authorize('viewAny', Agent::class);

        $agents = Agent::query()
            ->with(['agency', 'creator', 'leads'])
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get()
            ->map(fn (Agent $agent): array => self::summary($agent))
            ->all();

        return Inertia::render('real-estate/agents', ['agents' => $agents, 'agencies' => $this->agencyOptions()]);
    }

    public function show(Agent $agent): Response
    {
        $this->authorize('view', $agent);

        $agent->load(['agency.agents', 'creator', 'leads']);

        return Inertia::render('real-estate/agent', [
            'agent' => self::summary($agent),
            // Fiche de son agence, pour la carte « Agence » de la page.
            'agency' => $agent->agency === null ? null : [
                'id' => $agent->agency->id,
                'uuid' => $agent->agency->uuid,
                'name' => $agent->agency->name,
                'street' => $agent->agency->street,
                'postal_code' => $agent->agency->postal_code,
                'city' => $agent->agency->city,
                'phone' => $agent->agency->phone,
                'email' => $agent->agency->email,
                'website' => $agent->agency->website,
                'agents_count' => $agent->agency->agents->count(),
            ],
            'agencies' => $this->agencyOptions(),
        ]);
    }

    /**
     * @return array<int, array{id: int, uuid: string, name: string}>
     */
    private function agencyOptions(): array
    {
        return Agency::query()
            ->orderBy('name')
            ->get()
            ->map(fn (Agency $agency): array => ['id' => $agency->id, 'uuid' => $agency->uuid, 'name' => $agency->name])
            ->all();
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
            'position' => $agent->position?->label(),
            'position_value' => $agent->position?->value,
            'street' => $agent->street,
            'postal_code' => $agent->postal_code,
            'city' => $agent->city,
            'email' => $agent->email,
            'phone' => $agent->phone,
            'notes' => $agent->notes,
            'agency' => $agent->agency === null ? null : ['id' => $agent->agency->id, 'uuid' => $agent->agency->uuid, 'name' => $agent->agency->name],
            // Leads dont il est le contact, du plus récent au plus ancien.
            'leads' => $agent->leads->map(fn (Lead $lead): array => [
                'uuid' => $lead->uuid,
                'name' => $lead->fullName(),
                'status_label' => $lead->status->label(),
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

    public function import(ImportAgentsRequest $request, ImportAgents $import): RedirectResponse
    {
        $this->authorize('create', Agent::class);

        /** @var list<array<string, mixed>> $rows */
        $rows = $request->validated('rows');
        $result = $import->handle(array_map(AgentImportRowData::from(...), $rows), $request->user());

        $message = __(':created agent(s) importé(s), :skipped ignoré(s) car déjà présent(s), :agencies agence(s) créée(s).', [
            'created' => $result['created'],
            'skipped' => $result['skipped'],
            'agencies' => $result['agencies_created'],
        ]);
        Inertia::flash('toast', ['type' => $result['created'] > 0 ? 'success' : 'warning', 'message' => $message]);

        return back();
    }

    public function store(StoreAgentRequest $request, CreateAgent $create): RedirectResponse
    {
        $this->authorize('create', Agent::class);

        $agent = $create->handle(AgentData::from($request->validated()), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Agent :name ajouté.', ['name' => $agent->fullName()])]);

        return back();
    }

    public function update(UpdateAgentRequest $request, Agent $agent, UpdateAgent $update): RedirectResponse
    {
        $this->authorize('update', $agent);

        $agent = $update->handle($agent, AgentData::from($request->validated()));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Agent :name mis à jour.', ['name' => $agent->fullName()])]);

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
