<?php

declare(strict_types=1);

namespace App\Actions\Documents;

use App\Actions\Invoices\SendInvoice;
use App\Data\DossierBriefData;
use App\Models\DocumentRequest;
use App\Services\DocRaptor;
use App\Support\DossierPlan;
use RuntimeException;

/**
 * Fiche récapitulative qui ouvre une partie du dossier fusionné (« Revenus et
 * salaires — Léa Durand ») : la synthèse de l'assistant, ses faits chiffrés,
 * la liste des pièces qui suivent et les réserves. Rendue en français, par
 * DocRaptor, insérée par le navigateur juste avant les pièces de la partie.
 */
final readonly class RenderDossierSectionSheet
{
    public function __construct(private DocRaptor $docRaptor) {}

    /**
     * @throws RuntimeException si la partie n'existe pas ou n'a pas de fiche
     */
    public function handle(DocumentRequest $request, string $key): string
    {
        return $this->docRaptor->pdf($this->html($request, $key), "fiche-{$key}.pdf");
    }

    public function html(DocumentRequest $request, string $key): string
    {
        $plan = DossierPlan::section($request, $key);

        throw_if($plan === null, RuntimeException::class, 'Cette partie du dossier n’existe pas.');

        $brief = self::brief($request)?->section($key);

        return view('documents.dossier-sheet', [
            'request' => $request,
            'plan' => $plan,
            'brief' => $brief,
            'company' => config('company'),
            'logo' => SendInvoice::logoDataUri(),
        ])->render();
    }

    /** Synthèse enregistrée sur la liste, ou null si elle n'a pas encore été rédigée. */
    public static function brief(DocumentRequest $request): ?DossierBriefData
    {
        return $request->dossier_brief === null ? null : DossierBriefData::from($request->dossier_brief);
    }

    /**
     * Vrai si la synthèse a été rédigée sur **ces** pièces validées : une pièce
     * ajoutée, retirée ou remise en vérification depuis la périme.
     */
    public static function isFresh(DocumentRequest $request): bool
    {
        return $request->dossier_brief !== null
            && $request->dossier_brief_fingerprint === DossierPlan::fingerprint($request);
    }
}
