<?php

declare(strict_types=1);

namespace App\Actions\Storage;

use App\Models\DocumentUpload;
use App\Support\UploadLimits;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

/**
 * Vérifie la chaîne de dépôt des fichiers, telle que la production la vit :
 * quel disque sert réellement (local ou bucket), s'il accepte d'écrire, de
 * relire par un lien signé et d'effacer, et ce que PHP laisse passer comme
 * taille d'envoi. Pensé pour être lancé depuis la console de Laravel Cloud
 * quand « l'upload ne marche pas » : chaque ligne dit où ça casse.
 */
final class CheckStorageSetup
{
    public const string FAIL = 'fail';

    public const string WARN = 'warn';

    public const string OK = 'ok';

    /**
     * @return list<array{level: string, check: string, detail: string}>
     */
    public function handle(): array
    {
        $checks = [];

        foreach ([DocumentUpload::DISK => 'pièces des clients', 'public' => 'photos et portraits'] as $disk => $usage) {
            $driver = (string) config("filesystems.disks.{$disk}.driver");
            $bucket = config("filesystems.disks.{$disk}.bucket");

            $checks[] = [
                'level' => $driver === 's3' ? self::OK : (app()->isProduction() ? self::FAIL : self::WARN),
                'check' => "Disque « {$disk} » ({$usage})",
                'detail' => $driver === 's3'
                    ? "bucket {$bucket}, préfixe ".config("filesystems.disks.{$disk}.root")
                    : 'disque local du serveur — éphémère sur Laravel Cloud : renseignez AWS_BUCKET, AWS_ENDPOINT, AWS_ACCESS_KEY_ID et AWS_SECRET_ACCESS_KEY',
            ];

            $checks[] = $this->probe($disk);
        }

        $checks[] = $this->limits();

        return $checks;
    }

    /**
     * @param  list<array{level: string, check: string, detail: string}>  $checks
     */
    public static function failed(array $checks): bool
    {
        return array_any($checks, fn (array $check): bool => $check['level'] === self::FAIL);
    }

    /**
     * Écrit, relit (par lien signé sur un bucket), efface : le trajet exact
     * d'une pièce déposée.
     *
     * @return array{level: string, check: string, detail: string}
     */
    private function probe(string $disk): array
    {
        $path = '_probe/'.Str::uuid().'.txt';
        $storage = Storage::disk($disk);

        try {
            $storage->put($path, 'sonde '.now()->toIso8601String());

            if (! $storage->exists($path)) {
                return ['level' => self::FAIL, 'check' => "Écriture sur « {$disk} »", 'detail' => 'le fichier écrit est introuvable juste après'];
            }

            $detail = 'écriture, relecture et suppression OK';

            if (config("filesystems.disks.{$disk}.driver") === 's3') {
                $url = $storage->temporaryUrl($path, now()->addMinutes(2));
                $detail .= ' · lien signé : '.parse_url($url, PHP_URL_HOST).parse_url($url, PHP_URL_PATH);
            }

            $storage->delete($path);

            return ['level' => self::OK, 'check' => "Écriture sur « {$disk} »", 'detail' => $detail];
        } catch (Throwable $exception) {
            return ['level' => self::FAIL, 'check' => "Écriture sur « {$disk} »", 'detail' => Str::limit($exception->getMessage(), 200)];
        }
    }

    /**
     * @return array{level: string, check: string, detail: string}
     */
    private function limits(): array
    {
        $perFile = UploadLimits::perFile();
        $target = 10 * 1024 * 1024;

        return [
            'level' => $perFile >= $target ? self::OK : self::WARN,
            'check' => 'Taille acceptée par PHP',
            'detail' => sprintf(
                '%s par fichier, %d fichiers, %s par envoi (upload_max_filesize=%s, post_max_size=%s)',
                $this->mb($perFile),
                UploadLimits::maxFiles(),
                $this->mb(UploadLimits::perRequest()),
                (string) ini_get('upload_max_filesize'),
                (string) ini_get('post_max_size'),
            ).($perFile >= $target ? '' : ' — sous les 10 Mo promis au client : relevez upload_max_filesize et post_max_size'),
        ];
    }

    private function mb(int $bytes): string
    {
        return number_format($bytes / 1024 / 1024, 1, ',', ' ').' Mo';
    }
}
