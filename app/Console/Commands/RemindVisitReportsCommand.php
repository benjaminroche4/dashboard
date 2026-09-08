<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Leads\SendVisioReportReminders;
use App\Actions\Visits\SendVisitReportReminders;
use Illuminate\Console\Command;

final class RemindVisitReportsCommand extends Command
{
    protected $signature = 'visits:remind-reports';

    protected $description = 'Rappelle à chaque responsable de visite ou d\'appel vidéo passé de rédiger son compte rendu';

    public function handle(SendVisitReportReminders $visitReminders, SendVisioReportReminders $visioReminders): int
    {
        $count = $visitReminders->handle() + $visioReminders->handle();

        $this->info($count === 0 ? 'Aucun compte rendu à rappeler.' : "{$count} rappel(s) envoyé(s).");

        return self::SUCCESS;
    }
}
