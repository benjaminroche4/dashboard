<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Actions\Leads\QualifyLead;
use App\Models\Lead;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Qualification IA d'un lead arrivé seul (site, téléphone), en arrière-plan :
 * une panne de l'assistant est journalisée, jamais bloquante.
 */
final class QualifyLeadJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public function __construct(public readonly Lead $lead) {}

    public function handle(QualifyLead $qualify): void
    {
        try {
            $qualify->handle($this->lead->fresh() ?? $this->lead);
        } catch (RuntimeException $exception) {
            Log::warning('Qualification IA du lead impossible.', ['lead' => $this->lead->id, 'error' => $exception->getMessage()]);
        }
    }
}
