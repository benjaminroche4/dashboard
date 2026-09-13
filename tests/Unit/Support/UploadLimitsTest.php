<?php

declare(strict_types=1);

use App\Support\UploadLimits;

test('it reads the php notation', function (): void {
    expect(UploadLimits::bytes('8M'))->toBe(8 * 1024 * 1024)
        ->and(UploadLimits::bytes('512K'))->toBe(512 * 1024)
        ->and(UploadLimits::bytes('1G'))->toBe(1024 * 1024 * 1024)
        ->and(UploadLimits::bytes('1024'))->toBe(1024)
        ->and(UploadLimits::bytes(''))->toBe(0);
});

test('php has the last word: the page never promises more than the server accepts', function (): void {
    // Ce que PHP accorde ici borne ce que l'on annonce au client.
    $php = UploadLimits::bytes((string) ini_get('upload_max_filesize'));

    expect(UploadLimits::perFile())->toBeLessThanOrEqual(UploadLimits::WANTED_FILE_BYTES)
        ->and(UploadLimits::maxFiles())->toBeLessThanOrEqual(UploadLimits::WANTED_FILES)
        // Un dépôt entier tient dans `post_max_size`, marge comprise.
        ->and(UploadLimits::perRequest())->toBeLessThanOrEqual(UploadLimits::bytes((string) ini_get('post_max_size')))
        // Et il reste toujours de quoi envoyer au moins un fichier.
        ->and(UploadLimits::perRequest())->toBeGreaterThanOrEqual(UploadLimits::perFile());

    if ($php > 0) {
        expect(UploadLimits::perFile())->toBeLessThanOrEqual($php);
    }
});
