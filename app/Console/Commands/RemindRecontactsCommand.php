<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Leads\SendRecontactReminders;
use Illuminate\Console\Command;

final class RemindRecontactsCommand extends Command
{
    protected $signature = 'leads:remind-recontacts';

    protected $description = 'Envoie à chaque responsable ses recontacts du jour et en retard';

    public function handle(SendRecontactReminders $sendReminders): int
    {
        $count = $sendReminders->handle();

        $this->info($count === 0 ? 'Aucun recontact à rappeler.' : "{$count} responsable(s) prévenu(s).");

        return self::SUCCESS;
    }
}
