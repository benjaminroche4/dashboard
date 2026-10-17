<?php

declare(strict_types=1);

namespace App\Actions\Documents;

use App\Jobs\GenerateDossierBriefJob;
use App\Models\DocumentRequest;
use App\Services\Assistant;
use App\Support\DossierPlan;
use RuntimeException;

/**
 * Lance la préparation du dossier en arrière-plan : lire toutes les pièces
 * prend plusieurs minutes, la page ne peut pas attendre. La demande est datée
 * sur la liste pour que l'écran dise « en cours » ; la synthèse arrive par
 * `DashboardUpdated` quand le job a fini.
 */
final readonly class RequestDossierBrief
{
    public function __construct(private Assistant $assistant) {}

    /** `$force` : relire toutes les parties, même celles dont les fichiers n'ont pas bougé. */
    public function handle(DocumentRequest $request, bool $force = false): void
    {
        throw_unless($this->assistant->isConfigured(), RuntimeException::class, 'Assistant IA non configuré (ANTHROPIC_API_KEY).');

        $request->loadMissing('uploads');

        throw_unless(DossierPlan::hasValidFiles($request), RuntimeException::class, 'Aucune pièce validée : la synthèse se prépare dès qu’au moins une pièce est validée.');

        $request->forceFill(['dossier_brief_requested_at' => now()])->save();

        dispatch(new GenerateDossierBriefJob($request, $force));
    }
}
