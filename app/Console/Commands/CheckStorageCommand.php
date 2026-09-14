<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Storage\CheckStorageSetup;
use Illuminate\Console\Command;

/** `php artisan storage:check` : à lancer depuis la console Cloud quand un dépôt échoue. */
final class CheckStorageCommand extends Command
{
    protected $signature = 'storage:check';

    protected $description = 'Vérifie la chaîne de dépôt des fichiers (disques, bucket, lien signé, limites PHP)';

    public function handle(CheckStorageSetup $check): int
    {
        $checks = $check->handle();

        $this->table(
            ['', 'Point de contrôle', 'Détail'],
            array_map(fn (array $row): array => [
                match ($row['level']) {
                    CheckStorageSetup::FAIL => '<fg=red>ÉCHEC</>',
                    CheckStorageSetup::WARN => '<fg=yellow>ATTENTION</>',
                    default => '<fg=green>OK</>',
                },
                $row['check'],
                $row['detail'],
            ], $checks),
        );

        if (CheckStorageSetup::failed($checks)) {
            $this->error('Le dépôt de fichiers est cassé : corrigez les lignes en échec.');

            return self::FAILURE;
        }

        $this->info('Le dépôt de fichiers fonctionne.');

        return self::SUCCESS;
    }
}
