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
     * refusée par l'équipe n'entre pas dans le dossier : elle est comptée
     * **manquante**, comme sur la page de dépôt du client.
     *
     * @return list<array{name: string, role: string, received: list<array{label: string, files: int}>, missing: list<string>}>
     */
    public static function persons(DocumentRequest $request): array
    {
        $uploads = self::valid($request);

        return array_map(function (array $person, int $index) use ($uploads): array {
            $received = [];
            $missing = [];

            foreach ($person['categories'] as $category) {
                foreach ($category['documents'] as $document) {
                    $files = $uploads
                        ->where('person_index', $index)
                        ->where('document_key', $document['key'])
                        ->count();

                    if ($files === 0) {
                        $missing[] = $document['label'];

                        continue;
                    }

                    $received[] = ['label' => $document['label'], 'files' => $files];
                }
            }

            return [
                'name' => $person['name'],
                'role' => $person['role'],
                'received' => $received,
                'missing' => $missing,
            ];
        }, RenderDocumentRequestPdf::persons($request), array_keys($request->persons));
    }

    /** Nombre de fichiers valides, ceux que le dossier fusionné emporte. */
    public static function files(DocumentRequest $request): int
    {
        return self::valid($request)->count();
    }

    /**
     * Pièces valides : tout sauf celles que l'équipe a refusées.
     *
     * @return Collection<int, DocumentUpload>
     */
    private static function valid(DocumentRequest $request): Collection
    {
        return $request->uploads->reject(
            fn (DocumentUpload $upload): bool => $upload->status === DocumentUploadStatus::Refused,
        );
    }

    public static function fileName(DocumentRequest $request): string
    {
        $slug = str($request->fullName())->slug()->value();

        return 'dossier-'.($slug !== '' ? $slug : $request->uuid).'.pdf';
    }

    /** Poids total des pièces valides, pour prévenir avant une grosse fusion. */
    public static function weight(DocumentRequest $request): int
    {
        return (int) self::valid($request)->sum(fn (DocumentUpload $upload): int => $upload->size);
    }
}
