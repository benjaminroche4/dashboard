<?php

declare(strict_types=1);

namespace App\Actions\Visits;

use App\Events\DashboardUpdated;
use App\Models\Visit;
use Illuminate\Support\Facades\Storage;

/**
 * Supprime une visite et les photos de son compte rendu (le bien reste dans
 * l'annuaire).
 */
final class DeleteVisit
{
    public function handle(Visit $visit): void
    {
        $visit->loadMissing('lead');
        $id = $visit->id;
        $name = $visit->lead->fullName();
        $photos = $visit->report_photos ?? [];

        $visit->delete();

        if ($photos !== []) {
            Storage::disk(SubmitVisitReport::DISK)->delete($photos);
        }

        event(new DashboardUpdated('visits', ['id' => $id, 'deleted' => true], "a supprimé une visite de {$name}"));
    }
}
