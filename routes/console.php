<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Schedule;

// Chaque nuit : les factures envoyées dont l'échéance est passée deviennent « en retard ».
Schedule::command('invoices:mark-overdue')->dailyAt('02:00');
