<?php

declare(strict_types=1);

namespace App\Http\Controllers\Webhooks;

use App\Actions\Webhooks\ClaimWebhookDelivery;
use App\Actions\Webhooks\ImportWebsiteContact;
use App\Data\WebsiteContactData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Webhooks\StoreWebsiteContactRequest;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;

/**
 * Réception des demandes de contact du site Relocation In Paris.
 */
class WebsiteContactController extends Controller
{
    public function __invoke(StoreWebsiteContactRequest $request, ImportWebsiteContact $importContact, ClaimWebhookDelivery $claim): JsonResponse
    {
        // Anti-rejeu : la signature ne porte pas d'horodatage, une requête capturée
        // (même corps, même signature) est reconnue à son empreinte et ignorée.
        if (! $claim->handle('rip', hash('sha256', (string) $request->getContent()))) {
            $existing = Lead::query()->where('external_reference', (string) $request->validated('reference'))->first();

            return response()->json(['lead_id' => $existing?->id, 'reference' => $existing?->reference, 'created' => false, 'outcome' => 'duplicate'], 200);
        }

        $lead = $importContact->handle(WebsiteContactData::from($request->validated()));

        return response()->json(
            ['lead_id' => $lead->id, 'reference' => $lead->reference, 'created' => $lead->wasRecentlyCreated],
            $lead->wasRecentlyCreated ? 201 : 200,
        );
    }
}
