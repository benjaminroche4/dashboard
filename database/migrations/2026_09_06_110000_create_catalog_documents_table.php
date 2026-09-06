<?php

declare(strict_types=1);

use App\Enums\DocumentCategory;
use App\Support\DocumentCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('catalog_documents', function (Blueprint $table): void {
            $table->id();
            // Clé stable référencée par document_requests.persons[].documents.
            $table->string('key')->unique();
            $table->string('category');
            $table->string('label');
            $table->string('label_en')->nullable();
            $table->string('hint', 500)->nullable();
            $table->string('hint_en', 500)->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        // Le catalogue historique (58 pièces) devient le contenu initial, traductions comprises.
        $en = json_decode((string) file_get_contents(lang_path('en.json')), true) ?: [];
        $now = now();
        $rows = [];

        foreach (DocumentCatalog::defaults() as $category => $entries) {
            $position = 0;

            foreach ($entries as $key => [$label, $hint]) {
                $rows[] = [
                    'key' => $key,
                    'category' => DocumentCategory::from($category)->value,
                    'label' => $label,
                    'label_en' => $en[$label] ?? null,
                    'hint' => $hint,
                    'hint_en' => $hint === null ? null : ($en[$hint] ?? null),
                    'position' => ++$position,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        DB::table('catalog_documents')->insert($rows);
    }

    public function down(): void
    {
        Schema::dropIfExists('catalog_documents');
    }
};
