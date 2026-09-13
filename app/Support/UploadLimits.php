<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Ce que le serveur accepte vraiment pour un dépôt de pièces. PHP a le dernier
 * mot (`upload_max_filesize`, `post_max_size`, `max_file_uploads`) : la page
 * publique ne doit pas promettre 10 Mo à un client si l'hébergement en refuse
 * 3 — il verrait son fichier disparaître sans comprendre.
 */
final readonly class UploadLimits
{
    /** Ce que l'application vise, tant que PHP suit. */
    public const int WANTED_FILE_BYTES = 10 * 1024 * 1024;

    public const int WANTED_FILES = 10;

    /** Marge pour les champs du formulaire et l'encodage multipart. */
    private const int OVERHEAD_BYTES = 512 * 1024;

    /** Taille acceptée pour un fichier, en octets. */
    public static function perFile(): int
    {
        $php = self::bytes((string) ini_get('upload_max_filesize'));

        return $php > 0 ? min(self::WANTED_FILE_BYTES, $php) : self::WANTED_FILE_BYTES;
    }

    /** Poids accepté pour un envoi entier (tous les fichiers d'un dépôt). */
    public static function perRequest(): int
    {
        $php = self::bytes((string) ini_get('post_max_size'));
        $wanted = self::perFile() * self::maxFiles();

        return $php > 0 ? min($wanted, max($php - self::OVERHEAD_BYTES, self::perFile())) : $wanted;
    }

    /** Nombre de fichiers acceptés d'un coup. */
    public static function maxFiles(): int
    {
        $php = (int) ini_get('max_file_uploads');

        return $php > 0 ? min(self::WANTED_FILES, $php) : self::WANTED_FILES;
    }

    /**
     * Limites telles que la page publique les annonce au client.
     *
     * @return array{file: int, files: int, total: int}
     */
    public static function toArray(): array
    {
        return ['file' => self::perFile(), 'files' => self::maxFiles(), 'total' => self::perRequest()];
    }

    /** « 8M », « 512K », « 2G » ou un nombre d'octets → octets. */
    public static function bytes(string $value): int
    {
        $value = trim($value);

        if ($value === '') {
            return 0;
        }

        $number = (int) $value;
        $unit = strtolower(substr($value, -1));

        return match ($unit) {
            'g' => $number * 1024 * 1024 * 1024,
            'm' => $number * 1024 * 1024,
            'k' => $number * 1024,
            default => $number,
        };
    }
}
