<?php

declare(strict_types=1);

namespace App\Actions\Visits;

use App\Data\VisitReportData;
use App\Enums\VisitStatus;
use App\Events\DashboardUpdated;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Http\UploadedFile;

/**
 * Enregistre le compte rendu d'une visite : la visite passe en « Effectuée »
 * si elle était planifiée, les photos prises sur place sont ajoutées à celles
 * déjà déposées, le compte rendu est recopié en note du client.
 */
final class SubmitVisitReport
{
    public const string DISK = 'public';

    public const string DIRECTORY = 'visit-reports';

    public function handle(Visit $visit, VisitReportData $data, ?User $by = null): Visit
    {
        $photos = array_map(function (UploadedFile $photo): string {
            $path = $photo->store(self::DIRECTORY, self::DISK);
            throw_if($path === false, \RuntimeException::class, 'Impossible d\'enregistrer la photo de la visite.');

            return $path;
        }, $data->photos);

        $visit->report = $data->report;
        $visit->report_photos = [...($visit->report_photos ?? []), ...$photos];
        $visit->report_submitted_at = now();
        $visit->report_submitted_by = $by?->id;

        if ($visit->status === VisitStatus::Planned) {
            $visit->status = VisitStatus::Done;
        }

        $visit->save();
        $visit->load(['lead', 'property']);

        $count = count($visit->report_photos ?? []);
        $when = $visit->scheduled_at->translatedFormat('j F Y');
        $photoNote = $count === 0 ? '' : sprintf(' (%d photo%s)', $count, $count > 1 ? 's' : '');
        $visit->lead->notes()->create([
            'body' => "Compte rendu de la visite du {$when} ({$visit->property->label()}){$photoNote} : {$visit->report}",
            'user_id' => $by?->id,
        ]);

        event(new DashboardUpdated('visits', ['id' => $visit->id], "a rédigé le compte rendu de la visite de {$visit->lead->fullName()} : {$visit->property->label()}", $by));

        return $visit;
    }
}
