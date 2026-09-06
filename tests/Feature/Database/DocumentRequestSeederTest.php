<?php

declare(strict_types=1);

use App\Models\DocumentRequest;
use Database\Seeders\DocumentRequestSeeder;
use Database\Seeders\StaffSeeder;

test('the seeder creates sample requests linked to the admin', function (): void {
    $this->seed([StaffSeeder::class, DocumentRequestSeeder::class]);

    expect(DocumentRequest::query()->count())->toBe(4)
        ->and(DocumentRequest::query()->whereNull('created_by')->count())->toBe(0);
});
