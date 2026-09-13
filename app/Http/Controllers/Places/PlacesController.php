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

        /** @var array{input: string, regions?: list<string>, session?: string, kind?: 'address'|'cities'} $validated */
        $validated = $request->validated();

        $kind = $validated['kind'] ?? 'address';
        // Une adresse se cherche là où l'agence travaille ; une ville d'origine
        // peut être n'importe où dans le monde, on ne la restreint pas.
        $regions = $validated['regions'] ?? ($kind === 'cities' ? [] : ['ch', 'fr']);

        return response()->json([
            'suggestions' => $places->suggest(
                $validated['input'],
                array_map(strtolower(...), $regions),
                $validated['session'] ?? null,
                $kind,
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
