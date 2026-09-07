<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Leads\AlertFirstContactOverdue;
use Illuminate\Console\Command;

final class AlertFirstContactCommand extends Command
{
    protected $signature = 'leads:alert-first-contact';

    protected $description = "Alerte l'adresse de contact pour tout nouveau lead sans premier contact depuis 30 minutes";

    public function handle(AlertFirstContactOverdue $alert): int
    {
        $count = $alert->handle();

        $this->info($count === 0 ? 'Aucun lead en attente de premier contact.' : "{$count} lead(s) signalé(s).");

        return self::SUCCESS;
    }
}
