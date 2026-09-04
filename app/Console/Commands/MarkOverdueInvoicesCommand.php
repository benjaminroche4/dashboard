<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Invoices\MarkOverdueInvoices;
use Illuminate\Console\Command;

final class MarkOverdueInvoicesCommand extends Command
{
    protected $signature = 'invoices:mark-overdue';

    protected $description = 'Passe en retard les factures envoyées dont l\'échéance est dépassée';

    public function handle(MarkOverdueInvoices $markOverdue): int
    {
        $count = $markOverdue->handle();

        $this->info($count === 0 ? 'Aucune facture en retard.' : "{$count} facture(s) passée(s) en retard.");

        return self::SUCCESS;
    }
}
