<?php

declare(strict_types=1);

use App\Support\FileUrl;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

uses(TestCase::class);

test('a local disk answers with its public URL, unsigned', function (): void {
    // Sur la machine, les photos restent servies par /storage, sans signature.
    config(['filesystems.disks.essai' => [
        'driver' => 'local',
        'root' => storage_path('app/public'),
        'url' => 'http://localhost/storage',
    ]]);

    expect(FileUrl::for('essai', 'properties/photo.jpg'))
        ->toBe('http://localhost/storage/properties/photo.jpg');
});

test('nothing to show without a path', function (): void {
    Storage::fake('public');

    expect(FileUrl::for('public', null))->toBeNull()
        ->and(FileUrl::for('public', ''))->toBeNull()
        ->and(FileUrl::all('public', []))->toBe([]);
});

test('a bucket answers with a signed link that expires', function (): void {
    // Le disque est un bucket : l'adresse doit être signée, jamais publique.
    config(['filesystems.disks.bucket' => [
        'driver' => 's3',
        'key' => 'clé',
        'secret' => 'secret',
        'region' => 'europe-west9',
        'bucket' => 'rip-bucket',
        'endpoint' => 'https://storage.googleapis.com',
        'use_path_style_endpoint' => true,
    ]]);

    $url = FileUrl::for('bucket', 'properties/photo.jpg');

    expect($url)->toContain('rip-bucket/properties/photo.jpg')
        ->and($url)->toContain('X-Amz-Signature')
        ->and($url)->toContain('X-Amz-Expires='.(FileUrl::HOURS * 3600));
});

test('a list of paths keeps its order and drops the empty ones', function (): void {
    Storage::fake('public');

    expect(FileUrl::all('public', ['a.jpg', '', 'b.jpg']))
        ->toHaveCount(2)
        ->and(FileUrl::all('public', ['a.jpg', 'b.jpg'])[0])->toContain('a.jpg');
});
