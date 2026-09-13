<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Clients\SendPropertyDecisionReminders;
use App\Actions\Leads\SendVisioReportReminders;
use App\Actions\Visits\SendVisitReportReminders;
use Illuminate\Console\Command;

final class RemindVisitReportsCommand extends Command
{
    protected $signature = 'visits:remind-reports';

    protected $description = 'Rappelle les comptes rendus de visite et d\'appel vidéo à rédiger, et les biens visités qui attendent la décision du client';

    public function handle(
        SendVisitReportReminders $visitReminders,
        SendVisioReportReminders $visioReminders,
        SendPropertyDecisionReminders $decisionReminders,
    ): int {
        $count = $visitReminders->handle() + $visioReminders->handle() + $decisionReminders->handle();

        $this->info($count === 0 ? 'Rien à rappeler.' : "{$count} rappel(s) envoyé(s).");

        return self::SUCCESS;
    }
}
