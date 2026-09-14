<?php

declare(strict_types=1);

namespace App\Actions\Visits;

use App\Actions\Assistant\TranslateText;
use App\Actions\Clients\SetClientPropertyStatus;
use App\Data\VisitReportData;
use App\Enums\PropertyApplicationStatus;
use App\Enums\VisitStatus;
use App\Events\DashboardUpdated;
use App\Mail\VisitReportSent;
use App\Models\User;
use App\Models\Visit;
use App\Support\HouseholdMail;
use Illuminate\Http\UploadedFile;

/**
 * Enregistre le compte rendu d'une visite : la visite passe en « Effectuée »
 * si elle était planifiée, les photos prises sur place sont ajoutées à celles
 * déjà déposées, le compte rendu est recopié en note du client, et la
 * prochaine étape choisie met à jour le suivi du bien pour ce dossier.
 */
final readonly class SubmitVisitReport
{
    public const string DISK = 'public';

    public const string DIRECTORY = 'visit-reports';

    public function __construct(
        private SetClientPropertyStatus $status,
        private TranslateText $translate,
    ) {}

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
            'body' => "Compte rendu de la visite du {$when} ({$visit->property->label()}){$photoNote} : ".$visit->report,
            'user_id' => $by?->id,
        ]);

        // La prochaine étape décidée sur place met à jour le suivi du bien
        // pour ce dossier : le bien y est rattaché s'il ne l'était pas.
        if ($data->nextStatus instanceof PropertyApplicationStatus) {
            $this->status->handle($visit->lead, $visit->property, $data->nextStatus, $by);
        }

        $sentTo = $this->notifyClient($visit, $data);
        $sent = $sentTo === [] ? '' : ', envoyé à '.implode(', ', $sentTo);

        event(new DashboardUpdated('visits', ['id' => $visit->id], "a rédigé le compte rendu de la visite de {$visit->lead->fullName()} : {$visit->property->label()}{$sent}", $by));

        return $visit;
    }

    /**
     * Envoi du compte rendu au client, hors transaction et seulement s'il a été
     * demandé : le foyer en destinataires, les membres du suivi en copie.
     *
     * @return list<string> Adresses servies
     */
    private function notifyClient(Visit $visit, VisitReportData $data): array
    {
        if (! $data->notifyClient) {
            return [];
        }

        // Le client lit le compte rendu dans sa langue : l'équipe écrit en
        // français, l'assistant traduit avant l'envoi (et s'efface s'il ne
        // peut pas — le texte d'origine part alors tel quel).
        $report = $this->translate->handle((string) $visit->report, $visit->lead->language);

        $sent = HouseholdMail::send($visit->lead, new VisitReportSent($visit, $report));

        if ($sent !== []) {
            $visit->lead->notes()->create([
                'body' => 'Compte rendu de visite envoyé à '.implode(', ', $sent).'.',
            ]);
            $visit->lead->forceFill(['last_contacted_at' => now()])->save();
        }

        return $sent;
    }
}
