<?php

declare(strict_types=1);

namespace App\Http\Controllers\Clients;

use App\Actions\Agencies\AddAgencyFromPlace;
use App\Actions\Agencies\DiscoverAgencies;
use App\Actions\Agencies\DraftHousingSearchMessage;
use App\Actions\Agencies\SendHousingSearch;
use App\Actions\Clients\ExplainClientAgentSuggestions;
use App\Actions\Clients\SuggestClientAgents;
use App\Http\Controllers\Controller;
use App\Http\Requests\Agencies\SendHousingSearchRequest;
use App\Models\Agency;
use App\Models\Agent;
use App\Models\Lead;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use RuntimeException;

/**
 * Agences à contacter pour un dossier : affinage IA, mot rédigé, envoi de la
 * recherche, et découverte d'agences via Google Places.
 */
class ClientAgencyController extends Controller
{
    use AuthorizesRequests;

    /** Affine les agences suggérées avec l'assistant (JSON, cache par l'Action). */
    public function explain(Lead $lead, SuggestClientAgents $suggest, ExplainClientAgentSuggestions $explain): JsonResponse
    {
        $this->authorize('view', $lead);
        abort_unless($lead->isClient(), 404);

        $suggestions = array_map($this->forAssistant(...), $suggest->handle($lead));

        try {
            $result = $explain->handle($lead, $suggestions);
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return response()->json([
            'ranking' => $result['ranking'],
            'explanations' => array_map(
                fn (string $key): array => ['key' => $key, ...$result['explanations'][$key]],
                array_keys($result['explanations']),
            ),
        ]);
    }

    /** Le mot d'accompagnement de la recherche, proposé par l'assistant (JSON). */
    public function draft(Request $request, Lead $lead, DraftHousingSearchMessage $draft): JsonResponse
    {
        $this->authorize('view', $lead);
        abort_unless($lead->isClient(), 404);

        $agent = $this->agent($request->input('agent_id'));
        $agency = $this->agency($request->input('agency_id')) ?? $agent?->agency;

        try {
            $message = $draft->handle($lead, $agency, $agent, $request->user());
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return response()->json(['message' => $message]);
    }

    /** Envoie la recherche du client à l'agence ou à l'agent choisi. */
    public function send(SendHousingSearchRequest $request, Lead $lead, SendHousingSearch $send): RedirectResponse
    {
        $this->authorize('update', $lead);
        abort_unless($lead->isClient(), 404);

        $agent = $request->agent();
        $agency = $request->agency();
        $send->handle($lead, $agency, $agent, (string) $request->validated('email'), (string) $request->validated('message'), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Recherche envoyée à :name.', ['name' => $agent?->fullName() ?? ($agency instanceof Agency ? $agency->name : (string) $request->validated('email'))])]);

        return back();
    }

    /** Agences des quartiers visés qui ne sont pas encore dans l'annuaire (Google Places, JSON). */
    public function discover(Lead $lead, DiscoverAgencies $discover): JsonResponse
    {
        $this->authorize('view', $lead);
        abort_unless($lead->isClient(), 404);

        $districts = array_map(intval(...), $lead->districts ?? []);
        if ($districts === []) {
            return response()->json(['message' => 'Renseignez les quartiers visés du dossier pour chercher des agences.'], 422);
        }

        try {
            return response()->json(['agencies' => $discover->handle($districts)]);
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    /** Ajoute à l'annuaire une agence trouvée par la découverte. */
    public function addFromPlace(Request $request, Lead $lead, AddAgencyFromPlace $add): RedirectResponse
    {
        $this->authorize('create', Agency::class);
        abort_unless($lead->isClient(), 404);

        $placeId = trim((string) $request->input('place_id'));
        abort_if($placeId === '', 422);

        try {
            $agency = $add->handle($placeId, $request->user());
        } catch (RuntimeException $exception) {
            Inertia::flash('toast', ['type' => 'error', 'message' => $exception->getMessage()]);

            return back();
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Agence :name ajoutée à l’annuaire.', ['name' => $agency->name])]);

        return back();
    }

    /**
     * Ce que l'assistant lit d'une suggestion : le résumé du front, plus le
     * profil et les notes de l'agence en clair.
     *
     * @param  array{agency: Agency|null, agents: list<array{agent: Agent, score: int, reasons: list<string>, available: int}>, score: int, reasons: list<string>, available_properties: int}  $row
     * @return array<string, mixed>
     */
    private function forAssistant(array $row): array
    {
        $agency = $row['agency'];
        $agent = $row['agents'][0]['agent'] ?? null;
        $profile = $agency === null ? [] : array_filter([
            'quartiers' => ($agency->districts ?? []) === [] ? null : implode(', ', $agency->districts ?? []),
            'spécialités' => $agency->specialties?->map(fn ($s): string => $s->label())->implode(', ') ?: null,
            'langues' => $agency->languages?->map(fn ($l): string => $l->label())->implode(', ') ?: null,
            'frais' => $agency->fee_note,
            'loyers' => $agency->rent_min_cents === null && $agency->rent_max_cents === null ? null : number_format(($agency->rent_min_cents ?? 0) / 100, 0, ',', ' ').' – '.number_format(($agency->rent_max_cents ?? 0) / 100, 0, ',', ' ').' €',
            'Garantme' => $agency->accepts_garantme === null ? null : ($agency->accepts_garantme ? 'oui' : 'non'),
            'dossiers étrangers' => $agency->accepts_foreign_files === null ? null : ($agency->accepts_foreign_files ? 'oui' : 'non'),
        ]);

        return [
            ...SuggestClientAgents::summary($row),
            'profile_text' => $profile === [] ? null : implode(' ; ', array_map(fn (string $k, string $v): string => "{$k} : {$v}", array_keys($profile), $profile)),
            'notes' => trim(implode("\n", array_filter([$agency?->notes, $agent?->notes]))) ?: null,
        ];
    }

    private function agent(mixed $id): ?Agent
    {
        return $id === null || $id === '' ? null : Agent::query()->with('agency')->find((int) $id);
    }

    private function agency(mixed $id): ?Agency
    {
        return $id === null || $id === '' ? null : Agency::query()->find((int) $id);
    }
}
