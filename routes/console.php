<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Schedule;

// Chaque nuit : les factures envoyées dont l'échéance est passée deviennent « en retard ».
Schedule::command('invoices:mark-overdue')->dailyAt('02:00');

// Chaque minute : alerte à l'adresse de contact pour tout nouveau lead sans contact depuis 30 minutes.
Schedule::command('leads:alert-first-contact')->everyMinute();

// Chaque matin : rappel des recontacts du jour et en retard à chaque responsable.
Schedule::command('leads:remind-recontacts')->dailyAt('08:00');

// Chaque nuit : les devis envoyés dont la validité est passée deviennent « expirés ».
Schedule::command('quotes:mark-expired')->dailyAt('02:10');
