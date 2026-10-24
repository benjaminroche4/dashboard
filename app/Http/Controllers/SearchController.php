<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Search\SearchEverything;
use App\Http\Requests\Search\SearchRequest;
use Illuminate\Http\JsonResponse;

/**
 * Recherche unifiée de la palette ⌘K : une requête, tous les annuaires que
 * le membre a le droit de consulter, groupés et classés par pertinence.
 */
class SearchController extends Controller
{
    public function __invoke(SearchRequest $request, SearchEverything $search): JsonResponse
    {
        return response()->json($search->handle($request->user(), $request->needle()));
    }
}
