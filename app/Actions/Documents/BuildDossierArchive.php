<?php

declare(strict_types=1);

namespace App\Actions\Documents;

use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use App\Support\DossierPlan;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use ZipArchive;

/**
 * Toutes les pièces déposées dans une archive `.zip`, **non fusionnées** :
 * un dossier par personne, un fichier par pièce, tous numérotés pour que
 * l'ordre du dossier survive dans n'importe quel explorateur de fichiers.
 *
 * Même ordre que le PDF fusionné (`resources/js/lib/document-dossier.ts`),
 * celui de `DossierPlan` : locataires d'abord, puis les parties du dossier. **Les pièces
 * refusées par l'équipe en sont écartées** : elles ne sont pas valides, elles
 * n'ont rien à faire dans le dossier qu'on envoie.
 */
final readonly class BuildDossierArchive
{
    /**
     * Construit l'archive dans un fichier temporaire et renvoie son chemin :
     * au contrôleur de l'envoyer puis de l'effacer.
     *
     * @throws RuntimeException si l'archive ne peut pas être écrite
     */
    public function handle(DocumentRequest $request): string
    {
        $plan = self::plan($request);

        throw_if($plan === [], RuntimeException::class, 'Aucune pièce validée : il n’y a rien à archiver.');

        // Nom imprévisible dans un dossier à nous : pas de `tempnam`, dont la
        // fenêtre entre la création et l'ouverture est une course.
        $directory = storage_path('framework/cache/dossiers');
        File::ensureDirectoryExists($directory);
        $path = $directory.'/'.Str::uuid()->toString().'.zip';
        $zip = new ZipArchive;

        throw_if($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true, RuntimeException::class, 'Impossible de créer l’archive du dossier.');

        foreach ($plan as $part) {
            $contents = Storage::disk(DocumentUpload::DISK)->get($part['upload']->path);

            // Un fichier disparu du stockage ne fait pas échouer l'archive.
            if ($contents === null) {
                continue;
            }

            $zip->addFromString($part['entry'], $contents);
        }

        $written = $zip->numFiles;
        $zip->close();

        throw_if($written === 0, RuntimeException::class, 'Aucune pièce n’a pu être ajoutée à l’archive.');

        return $path;
    }

    /**
     * Pièces à archiver, dans l'ordre du dossier (`DossierPlan`), avec leur
     * chemin dans le zip : un dossier par personne, un fichier par pièce
     * numéroté et préfixé de sa partie.
     *
     * @return list<array{entry: string, upload: DocumentUpload}>
     */
    public static function plan(DocumentRequest $request): array
    {
        $plan = [];
        $folders = [];
        $pieces = [];

        foreach (DossierPlan::sections($request) as $section) {
            $index = $section['person_index'];

            if (! isset($folders[$index])) {
                $folders[$index] = sprintf('%02d - %s (%s)', count($folders) + 1, self::clean($section['person']), self::clean($section['role']));
                $pieces[$index] = 0;
            }

            foreach ($section['documents'] as $document) {
                $count = count($document['uploads']);

                foreach ($document['uploads'] as $rank => $upload) {
                    $pieces[$index]++;
                    $plan[] = [
                        'entry' => sprintf(
                            '%s/%02d - %s - %s%s.pdf',
                            $folders[$index],
                            $pieces[$index],
                            self::clean($section['section']->label()),
                            self::clean($document['label']),
                            $count > 1 ? ' ('.($rank + 1).')' : '',
                        ),
                        'upload' => $upload,
                    ];
                }
            }
        }

        return $plan;
    }

    public static function fileName(DocumentRequest $request): string
    {
        $slug = str($request->fullName())->slug()->value();

        return 'dossier-'.($slug !== '' ? $slug : $request->uuid).'.zip';
    }

    /**
     * Libellé utilisable comme nom de fichier : les accents restent (les
     * explorateurs les acceptent), seuls les caractères interdits partent.
     */
    private static function clean(string $label): string
    {
        $clean = preg_replace('#[/\\\\:*?"<>|]+#', ' ', $label) ?? $label;

        return trim(preg_replace('/\s+/', ' ', $clean) ?? $clean);
    }
}
