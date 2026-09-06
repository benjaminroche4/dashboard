<?php

declare(strict_types=1);

namespace App\Http\Controllers\Webhooks;

use App\Actions\Phone\RecordPhoneEvent;
use App\Data\PhoneEventData;
use App\Enums\PhoneEventKind;
use App\Http\Controllers\Controller;
use App\Http\Requests\Webhooks\StoreAlloEventRequest;
use Illuminate\Http\JsonResponse;

/**
 * Réception des événements de la téléphonie Allo (appels terminés, SMS reçus).
 */
class AlloWebhookController extends Controller
{
    public function __invoke(StoreAlloEventRequest $request, RecordPhoneEvent $recordEvent): JsonResponse
    {
        $topic = $request->validated('topic');

        if (! in_array($topic, PhoneEventKind::values(), true)) {
            return response()->json(['outcome' => RecordPhoneEvent::OUTCOME_IGNORED, 'topic' => $topic]);
        }

        $outcome = $recordEvent->handle(
            PhoneEventData::from($topic, $request->validated('data')),
            (string) $request->header('webhook-id'),
        );

        return response()->json(['outcome' => $outcome, 'topic' => $topic]);
    }
}
