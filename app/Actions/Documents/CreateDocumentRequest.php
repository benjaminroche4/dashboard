<?php

declare(strict_types=1);

namespace App\Actions\Documents;

use App\Data\DocumentRequestData;
use App\Events\DashboardUpdated;
use App\Models\DocumentRequest;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * Enregistre une demande de pièces prête à être téléchargée en PDF ou
 * envoyée au client.
 */
final class CreateDocumentRequest
{
    public function handle(DocumentRequestData $data, ?User $by = null): DocumentRequest
    {
        $request = DocumentRequest::query()->create([
            ...$data->toArray(),
            'public_token' => Str::random(48),
            'access_code' => self::accessCode(),
            'created_by' => $by?->id,
        ]);

        event(new DashboardUpdated('documents', ['id' => $request->id], 'a préparé une demande de pièces pour '.$request->fullName()));

        return $request;
    }

    /** Code d'appairage à 6 chiffres, demandé au client sur la page publique de dépôt. */
    public static function accessCode(): string
    {
        return str_pad((string) random_int(0, 999_999), 6, '0', STR_PAD_LEFT);
    }
}
