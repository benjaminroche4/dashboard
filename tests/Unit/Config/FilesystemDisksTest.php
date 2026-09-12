<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Request;
use Tests\TestCase;

uses(TestCase::class);

/** Configuration des disques telle qu'elle serait lue avec cet environnement. */
function disks(array $env): array
{
    $previous = [];

    foreach ($env as $key => $value) {
        $previous[$key] = Request::server($key) ?? null;
        $_SERVER[$key] = $value;
    }

    try {
        return (require base_path('config/filesystems.php'))['disks'];
    } finally {
        foreach ($previous as $key => $value) {
            if ($value === null) {
                unset($_SERVER[$key]);
            } else {
                $_SERVER[$key] = $value;
            }
        }
    }
}

test('without a bucket, files stay on the machine', function (): void {
    $disks = disks(['AWS_BUCKET' => '']);

    expect($disks['local']['driver'])->toBe('local')
        ->and($disks['local']['root'])->toBe(storage_path('app/private'))
        // Le disque privé est servi par une route Laravel, jamais par une URL publique.
        ->and($disks['local']['serve'])->toBeTrue()
        ->and($disks['public']['driver'])->toBe('local')
        ->and($disks['public']['root'])->toBe(storage_path('app/public'));
});

test('a configured bucket moves both disks to the object storage, without touching the code', function (): void {
    $disks = disks([
        'AWS_BUCKET' => 'rip-dashboard',
        'AWS_URL' => 'https://cdn.example.com',
        'AWS_DEFAULT_REGION' => 'eu-west-3',
    ]);

    // Les deux disques que l'application nomme (`local`, `public`) pointent
    // dans le même bucket, sous deux préfixes séparés.
    expect($disks['local']['driver'])->toBe('s3')
        ->and($disks['local']['bucket'])->toBe('rip-dashboard')
        ->and($disks['local']['root'])->toBe('private')
        ->and($disks['local']['visibility'])->toBe('private')
        ->and($disks['public']['driver'])->toBe('s3')
        ->and($disks['public']['root'])->toBe('public')
        ->and($disks['public']['visibility'])->toBe('public')
        // Les URL des photos sortent du bucket (ou de son CDN), plus de /storage.
        ->and($disks['public']['url'])->toBe('https://cdn.example.com');
});
