<?php

declare(strict_types=1);

use App\Models\DocumentRequest;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_requests', function (Blueprint $table): void {
            // Jeton du lien public de dépôt (/depot/{jeton}), non devinable.
            $table->string('public_token', 64)->nullable()->after('upload_url');
            // Le lien externe (Drive…) devient facultatif : le dépôt se fait sur la page publique.
            $table->string('upload_url', 2048)->nullable()->change();
        });

        DocumentRequest::query()->whereNull('public_token')->each(function (DocumentRequest $request): void {
            $request->forceFill(['public_token' => Str::random(48)])->saveQuietly();
        });

        Schema::table('document_requests', function (Blueprint $table): void {
            $table->string('public_token', 64)->nullable(false)->unique()->change();
        });

        Schema::create('document_uploads', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('document_request_id')->constrained('document_requests')->cascadeOnDelete();
            // Index de la personne du foyer (0 à 3) et clé de la pièce du catalogue.
            $table->unsignedTinyInteger('person_index');
            $table->string('document_key');
            $table->string('original_name');
            $table->string('path', 1024);
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size');
            $table->timestamps();

            $table->index(['document_request_id', 'person_index', 'document_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_uploads');

        Schema::table('document_requests', function (Blueprint $table): void {
            $table->dropUnique(['public_token']);
            $table->dropColumn('public_token');
        });
    }
};
