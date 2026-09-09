<?php

declare(strict_types=1);

use App\Models\DocumentRequest;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Chaque colonne est vérifiée avant d'être ajoutée : un déploiement interrompu au milieu
     * peut être relancé sans échouer sur une colonne déjà créée.
     */
    public function up(): void
    {
        Schema::table('document_requests', function (Blueprint $table): void {
            if (! Schema::hasColumn('document_requests', 'access_code')) {
                // Code d'appairage à 6 chiffres demandé sur la page publique de dépôt.
                $table->string('access_code', 6)->nullable()->after('public_token');
            }

            if (! Schema::hasColumn('document_requests', 'link_sent_to')) {
                // Dernier envoi du lien de dépôt par e-mail.
                $table->string('link_sent_to')->nullable()->after('access_code');
            }

            if (! Schema::hasColumn('document_requests', 'link_sent_at')) {
                $table->timestamp('link_sent_at')->nullable()->after('link_sent_to');
            }
        });

        DocumentRequest::query()->whereNull('access_code')->each(function (DocumentRequest $request): void {
            $request->forceFill(['access_code' => str_pad((string) random_int(0, 999_999), 6, '0', STR_PAD_LEFT)])->saveQuietly();
        });

        Schema::table('document_requests', function (Blueprint $table): void {
            $table->string('access_code', 6)->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('document_requests', function (Blueprint $table): void {
            $table->dropColumn(['access_code', 'link_sent_to', 'link_sent_at']);
        });
    }
};
