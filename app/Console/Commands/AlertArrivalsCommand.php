<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Clients\SendArrivalAlerts;
use Illuminate\Console\Command;

final class AlertArrivalsCommand extends Command
{
    protected $signature = 'clients:alert-arrivals';

    protected $description = 'Alerte les personnes de suivi quand l\'installation d\'un client approche (J-15, J-7, J-3)';

    public function handle(SendArrivalAlerts $alerts): int
    {
        $count = $alerts->handle();

        $this->info($count === 0 ? 'Aucune installation à signaler.' : "{$count} alerte(s) envoyée(s).");

        return self::SUCCESS;
    }
}
