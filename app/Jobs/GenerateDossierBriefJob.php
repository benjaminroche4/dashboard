<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Actions\Documents\GenerateDossierBrief;
use App\Events\DashboardUpdated;
use App\Models\DocumentRequest;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Synthèse du dossier fusionné en arrière-plan : une partie après l'autre,
 * puis la page de garde. Une panne est journalisée et dite à l'écran — la
 * demande est effacée pour que le bouton redevienne cliquable.
 */
final class GenerateDossierBriefJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    /** Une dizaine de parties, chacune un appel de quelques dizaines de secondes. */
    public int $timeout = 900;

    public function __construct(public readonly DocumentRequest $request, public readonly bool $force = false) {}

    public function handle(GenerateDossierBrief $generate): void
    {
        $request = $this->request->fresh() ?? $this->request;

        try {
            $generate->handle($request, $this->force);
        } catch (RuntimeException $exception) {
            Log::warning('Synthèse du dossier impossible.', ['request' => $request->id, 'error' => $exception->getMessage()]);

            $request->forceFill(['dossier_brief_requested_at' => null, 'dossier_brief_progress' => null])->save();
            $request->loadMissing('lead.assignee', 'lead.coAssignee');

            event(new DashboardUpdated(
                'documents',
                ['id' => $request->id, 'uuid' => $request->uuid, 'mentions' => GenerateDossierBrief::mentions($request)],
                sprintf('La préparation du dossier de %s a échoué : %s', $request->fullName(), $exception->getMessage()),
            ));
        }
    }
}
