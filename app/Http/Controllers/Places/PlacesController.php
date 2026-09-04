<?php

declare(strict_types=1);

namespace App\Http\Controllers\Places;

use App\Http\Controllers\Controller;
use App\Http\Requests\Places\DetailsRequest;
use App\Http\Requests\Places\SuggestRequest;
use App\Services\GooglePlaces;
use Illuminate\Http\JsonResponse;

/**
 * Proxy authentifié vers Google Places : la clé reste côté serveur.
 */
class PlacesController extends Controller
{
    public function suggest(SuggestRequest $request): JsonResponse
    {
        $places = GooglePlaces::fromConfig();

        abort_unless($places->isConfigured(), 503, __('L\'autocomplétion d\'adresse n\'est pas configurée.'));

        /** @var array{input: string, regions?: list<string>, session?: string} $validated */
        $validated = $request->validated();

        return response()->json([
            'suggestions' => $places->suggest(
                $validated['input'],
                array_map(strtolower(...), $validated['regions'] ?? ['ch', 'fr']),
                $validated['session'] ?? null,
            ),
        ]);
    }

    public function details(DetailsRequest $request): JsonResponse
    {
        $places = GooglePlaces::fromConfig();

        abort_unless($places->isConfigured(), 503, __('L\'autocomplétion d\'adresse n\'est pas configurée.'));

        /** @var array{place_id: string, session?: string} $validated */
        $validated = $request->validated();

        return response()->json([
            'address' => $places->details($validated['place_id'], $validated['session'] ?? null),
        ]);
    }
}
