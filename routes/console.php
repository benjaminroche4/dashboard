<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Schedule;

// Chaque nuit : les factures envoyées dont l'échéance est passée deviennent « en retard ».
Schedule::command('invoices:mark-overdue')->dailyAt('02:00')->withoutOverlapping()->onOneServer();

// Chaque minute : alerte à l'adresse de contact pour tout nouveau lead sans contact depuis 30 minutes.
Schedule::command('leads:alert-first-contact')->everyMinute()->withoutOverlapping()->onOneServer();

// Chaque matin : rappel des recontacts du jour et en retard à chaque responsable.
Schedule::command('leads:remind-recontacts')->dailyAt('08:00')->withoutOverlapping()->onOneServer();

// Chaque nuit : les devis envoyés dont la validité est passée deviennent « expirés ».
Schedule::command('quotes:mark-expired')->dailyAt('02:10')->withoutOverlapping()->onOneServer();

// Toutes les 15 minutes : rappel au responsable de chaque visite passée sans compte rendu.
Schedule::command('visits:remind-reports')->everyFifteenMinutes()->withoutOverlapping()->onOneServer();
