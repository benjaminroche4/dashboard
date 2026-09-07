<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Quotes\MarkExpiredQuotes;
use Illuminate\Console\Command;

final class MarkExpiredQuotesCommand extends Command
{
    protected $signature = 'quotes:mark-expired';

    protected $description = 'Passe en expiré les devis envoyés dont la validité est dépassée';

    public function handle(MarkExpiredQuotes $markExpired): int
    {
        $count = $markExpired->handle();

        $this->info($count === 0 ? 'Aucun devis expiré.' : "{$count} devis expiré(s).");

        return self::SUCCESS;
    }
}
