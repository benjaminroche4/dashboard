<?php

declare(strict_types=1);

namespace App\Actions\Documents;

use App\Actions\Invoices\SendInvoice;
use App\Enums\DocumentUploadStatus;
use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use App\Services\DocRaptor;
use App\Support\DossierPlan;
use Illuminate\Support\Collection;

/**
 * Page de garde du dossier fusionné : la présentation du foyer rédigée par
 * l'assistant quand elle existe (`GenerateDossierBrief`), et le sommaire des
 * pièces reçues **dans l'ordre où elles arrivent** dans le PDF — par personne
 * puis par partie —, celles qui manquent en gris. Le lien de dépôt et le code d'appairage n'y figurent pas :
 * ce document part chez une agence ou un propriétaire.
 *
 * Rendue **toujours en français** : c'est un document interne à l'équipe et à
 * ses partenaires, pas un document client.
 */
final readonly class RenderDossierCover
{
    public function __construct(private DocRaptor $docRaptor) {}

    /** `$withBrief` faux : la page de garde simple, même quand une synthèse à jour existe. */
    public function handle(DocumentRequest $request, bool $withBrief = true): string
    {
        return $this->docRaptor->pdf($this->html($request, $withBrief), self::fileName($request));
    }

    public function isConfigured(): bool
    {
        return $this->docRaptor->isConfigured();
    }

    public function html(DocumentRequest $request, bool $withBrief = true): string
    {
        return view('documents.dossier-cover', [
            'request' => $request,
            'persons' => self::persons($request),
            // Page de garde rédigée par l'assistant, seulement si elle porte sur ces pièces et qu'on la veut.
            'brief' => $withBrief && RenderDossierSectionSheet::isFresh($request) ? RenderDossierSectionSheet::brief($request)?->cover : null,
            'company' => config('company'),
            'logo' => SendInvoice::logoDataUri(),
        ])->render();
    }

    /**
     * Sommaire : une entrée par personne, ses pièces reçues **dans l'ordre du
     * dossier** (par partie, puis par pièce, avec le nombre de fichiers) et ses
     * pièces manquantes. Une pièce qui n'a pas encore été **validée** par
     * l'équipe n'entre pas dans le dossier : reçue mais à vérifier, elle est
     * listée « en attente » ; refusée ou jamais déposée, elle est comptée
     * **manquante**.
     *
     * @return list<array{name: string, role: string, sections: list<array{label: string, documents: list<array{label: string, files: int}>}>, received: list<array{label: string, files: int}>, pending: list<string>, missing: list<string>}>
     */
    public static function persons(DocumentRequest $request): array
    {
        $uploads = self::valid($request);
        $waiting = $request->uploads->where('status', DocumentUploadStatus::Pending);
        $plan = DossierPlan::sections($request);
        $persons = RenderDocumentRequestPdf::persons($request);
        $result = [];

        foreach (DossierPlan::personOrder($request) as $index) {
            $person = $persons[$index] ?? null;

            if ($person === null) {
                continue;
            }

            $sections = [];
            $received = [];

            foreach ($plan as $section) {
                if ($section['person_index'] !== $index) {
                    continue;
                }

                $documents = array_map(fn (array $document): array => ['label' => $document['label'], 'files' => count($document['uploads'])], $section['documents']);
                $sections[] = ['label' => $section['section']->label(), 'documents' => $documents];
                $received = [...$received, ...$documents];
            }

            $pending = [];
            $missing = [];

            foreach ($person['categories'] as $category) {
                foreach ($category['documents'] as $document) {
                    if ($uploads->where('person_index', $index)->where('document_key', $document['key'])->isNotEmpty()) {
                        continue;
                    }

                    $isWaiting = $waiting->where('person_index', $index)->where('document_key', $document['key'])->isNotEmpty();

                    if ($isWaiting) {
                        $pending[] = $document['label'];
                    } else {
                        $missing[] = $document['label'];
                    }
                }
            }

            $result[] = [
                'name' => $person['name'],
                'role' => $person['role'],
                'sections' => $sections,
                'received' => $received,
                'pending' => $pending,
                'missing' => $missing,
            ];
        }

        return $result;
    }

    /** Nombre de fichiers validés, les seuls que le dossier fusionné emporte. */
    public static function files(DocumentRequest $request): int
    {
        return self::valid($request)->count();
    }

    /**
     * Pièces validées par l'équipe : rien ne sort du backoffice sans qu'un
     * membre l'ait vu. Une pièce déposée mais pas encore relue attend.
     *
     * @return Collection<int, DocumentUpload>
     */
    private static function valid(DocumentRequest $request): Collection
    {
        return DossierPlan::valid($request);
    }

    public static function fileName(DocumentRequest $request): string
    {
        $slug = str($request->fullName())->slug()->value();

        return 'dossier-'.($slug !== '' ? $slug : $request->uuid).'.pdf';
    }

    /** Poids total des pièces validées, pour prévenir avant une grosse fusion. */
    public static function weight(DocumentRequest $request): int
    {
        return (int) self::valid($request)->sum(fn (DocumentUpload $upload): int => $upload->size);
    }
}
