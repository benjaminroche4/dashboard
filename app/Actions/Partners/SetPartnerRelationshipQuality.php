<?php

declare(strict_types=1);

namespace App\Actions\Partners;

use App\Enums\RelationshipQuality;
use App\Events\DashboardUpdated;
use App\Models\Partner;
use App\Models\User;

/**
 * Note la qualité de la relation avec un partenaire. Sans changement, rien
 * n'est écrit ni diffusé.
 */
final class SetPartnerRelationshipQuality
{
    public function handle(Partner $partner, ?RelationshipQuality $quality, ?User $by = null): Partner
    {
        if ($partner->relationship_quality === $quality) {
            return $partner;
        }

        $partner->relationship_quality = $quality;
        $partner->save();

        $message = $quality instanceof RelationshipQuality
            ? "a noté la relation avec {$partner->name} : {$quality->label()}"
            : "a retiré la note de relation de {$partner->name}";

        event(new DashboardUpdated('partners', ['id' => $partner->id], $message, $by));

        return $partner;
    }
}
