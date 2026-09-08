<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Actions\Activity\RecordActivity as RecordActivityAction;
use App\Events\DashboardUpdated;
use Throwable;

/**
 * Journal d'activité : chaque DashboardUpdated porteur d'un message est
 * enregistré. Une erreur d'écriture est signalée sans faire échouer l'action
 * d'origine.
 */
final readonly class RecordActivity
{
    public function __construct(private RecordActivityAction $record) {}

    public function handle(DashboardUpdated $event): void
    {
        try {
            $this->record->handle($event);
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}
