<?php

declare(strict_types=1);

namespace App\Http\Controllers\Clients;

use App\Actions\Clients\AttachClientProperty;
use App\Actions\Clients\DetachClientProperty;
use App\Actions\Clients\ExplainClientPropertySuggestions;
use App\Actions\Clients\SetClientPropertyStatus;
use App\Actions\Clients\SuggestClientProperties;
use App\Enums\LeadStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Clients\AttachClientPropertyRequest;
use App\Http\Requests\Clients\SetClientPropertyStatusRequest;
use App\Models\Lead;
use App\Models\Property;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class ClientPropertyController extends Controller
{
    use AuthorizesRequests;

    public function store(AttachClientPropertyRequest $request, Lead $lead, AttachClientProperty $attach): RedirectResponse
    {
        abort_unless($lead->status === LeadStatus::Converted, 404);

        $property = Property::query()->findOrFail((int) $request->validated('property_id'));
        $attach->handle($lead, $property, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Bien :name rattaché au dossier.', ['name' => $property->label()])]);

        return back();
    }

    /**
     * Affine les biens suggérés avec l'assistant IA : classement et une phrase
     * d'explication par bien (JSON, mis en cache par l'Action).
     */
    public function explain(Lead $lead, SuggestClientProperties $suggest, ExplainClientPropertySuggestions $explain): JsonResponse
    {
        $this->authorize('view', $lead);
        abort_unless($lead->status === LeadStatus::Converted, 404);

        $suggestions = array_map(SuggestClientProperties::summary(...), $suggest->handle($lead));

        try {
            $result = $explain->handle($lead, $suggestions);
        } catch (\RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return response()->json([
            'ranking' => $result['ranking'],
            'explanations' => array_map(
                fn (int $id): array => ['id' => $id, ...$result['explanations'][$id]],
                array_keys($result['explanations']),
            ),
        ]);
    }

    /** Suite de la visite : positionnement du client, puis sort de sa candidature. */
    public function status(SetClientPropertyStatusRequest $request, Lead $lead, Property $property, SetClientPropertyStatus $setStatus): RedirectResponse
    {
        $this->authorize('update', $lead);
        abort_unless($lead->status === LeadStatus::Converted, 404);

        $status = $request->status();
        $setStatus->handle($lead, $property, $status, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':property : :status.', [
            'property' => $property->label(),
            'status' => $status->label(),
        ])]);

        return back();
    }

    public function destroy(Lead $lead, Property $property, DetachClientProperty $detach): RedirectResponse
    {
        $this->authorize('update', $lead);
        abort_unless($lead->status === LeadStatus::Converted, 404);

        $detach->handle($lead, $property, auth()->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Bien :name retiré du dossier.', ['name' => $property->label()])]);

        return back();
    }
}
