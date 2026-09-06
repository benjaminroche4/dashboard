<?php

declare(strict_types=1);

namespace App\Http\Controllers\Webhooks;

use App\Actions\Webhooks\ImportWebsiteContact;
use App\Data\WebsiteContactData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Webhooks\StoreWebsiteContactRequest;
use Illuminate\Http\JsonResponse;

/**
 * Réception des demandes de contact du site Relocation In Paris.
 */
class WebsiteContactController extends Controller
{
    public function __invoke(StoreWebsiteContactRequest $request, ImportWebsiteContact $importContact): JsonResponse
    {
        $lead = $importContact->handle(WebsiteContactData::from($request->validated()));

        return response()->json(
            ['lead_id' => $lead->id, 'reference' => $lead->reference, 'created' => $lead->wasRecentlyCreated],
            $lead->wasRecentlyCreated ? 201 : 200,
        );
    }
}
