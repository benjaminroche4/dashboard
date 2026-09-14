<?php

declare(strict_types=1);

namespace App\Actions\Documents;

use App\Actions\Invoices\SendInvoice;
use App\Enums\DocumentUploadStatus;
use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use App\Services\DocRaptor;
use Illuminate\Support\Collection;

/**
 * Page de garde du dossier fusionné : qui est dans le foyer, et le sommaire
 * des pièces reçues **dans l'ordre où elles arrivent** dans le PDF, celles qui
 * manquent en gris. Le lien de dépôt et le code d'appairage n'y figurent pas :
 * ce document part chez une agence ou un propriétaire.
 *
 * Rendue **toujours en français** : c'est un document interne à l'équipe et à
 * ses partenaires, pas un document client.
 */
final readonly class RenderDossierCover
{
    public function __construct(private DocRaptor $docRaptor) {}

    public function handle(DocumentRequest $request): string
    {
        return $this->docRaptor->pdf($this->html($request), self::fileName($request));
    }

    public function isConfigured(): bool
    {
        return $this->docRaptor->isConfigured();
    }

    public function html(DocumentRequest $request): string
    {
        return view('documents.dossier-cover', [
            'request' => $request,
            'persons' => self::persons($request),
            'company' => config('company'),
            'logo' => SendInvoice::logoDataUri(),
        ])->render();
    }

    /**
     * Sommaire : une entrée par personne, ses pièces reçues (avec le nombre de
     * fichiers) et ses pièces manquantes, dans l'ordre du catalogue. Une pièce
     * qui n'a pas encore été **validée** par l'équipe n'entre pas dans le
     * dossier : reçue mais à vérifier, elle est listée « en attente » ;
     * refusée ou jamais déposée, elle est comptée **manquante**.
     *
     * @return list<array{name: string, role: string, received: list<array{label: string, files: int}>, pending: list<string>, missing: list<string>}>
     */
    public static function persons(DocumentRequest $request): array
    {
        $uploads = self::valid($request);
        $waiting = $request->uploads->where('status', DocumentUploadStatus::Pending);

        return array_map(function (array $person, int $index) use ($uploads, $waiting): array {
            $received = [];
            $pending = [];
            $missing = [];

            foreach ($person['categories'] as $category) {
                foreach ($category['documents'] as $document) {
                    $files = $uploads
                        ->where('person_index', $index)
                        ->where('document_key', $document['key'])
                        ->count();

                    if ($files > 0) {
                        $received[] = ['label' => $document['label'], 'files' => $files];

                        continue;
                    }

                    $isWaiting = $waiting
                        ->where('person_index', $index)
                        ->where('document_key', $document['key'])
                        ->isNotEmpty();

                    if ($isWaiting) {
                        $pending[] = $document['label'];
                    } else {
                        $missing[] = $document['label'];
                    }
                }
            }

            return [
                'name' => $person['name'],
                'role' => $person['role'],
                'received' => $received,
                'pending' => $pending,
                'missing' => $missing,
            ];
        }, RenderDocumentRequestPdf::persons($request), array_keys($request->persons));
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
        return $request->uploads->where('status', DocumentUploadStatus::Accepted);
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
