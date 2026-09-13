<?php

declare(strict_types=1);

use App\Enums\PropertyApplicationStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Suite d'une visite : le client se positionne ou non sur le bien, puis sa
 * candidature est acceptée ou refusée. L'état vit sur le lien dossier ↔ bien,
 * pas sur la visite : plusieurs visites peuvent porter sur le même bien.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('lead_property', 'status')) {
            return;
        }

        Schema::table('lead_property', function (Blueprint $table): void {
            $table->string('status', 20)->default(PropertyApplicationStatus::Pending->value);
            $table->timestamp('status_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('lead_property', fn (Blueprint $table) => $table->dropColumn(['status', 'status_at']));
    }
};
