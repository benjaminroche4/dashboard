<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\DocumentRequest;
use App\Models\User;
use Illuminate\Database\Seeder;

final class DocumentRequestSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->where('email', 'admin@admin.fr')->first();

        DocumentRequest::factory()->count(2)->create(['created_by' => $admin?->id]);
        DocumentRequest::factory()->withGuarantor()->create(['created_by' => $admin?->id]);
        DocumentRequest::factory()->english()->create(['created_by' => $admin?->id]);
    }
}
