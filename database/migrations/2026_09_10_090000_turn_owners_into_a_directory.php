<?php

declare(strict_types=1);

use App\Enums\OwnerKind;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * « Propriétaires » devient l'annuaire des propriétaires, plus un pipeline de
 * prospection : le statut, la date de dernier contact, le lead rattaché et le
 * nombre de biens déclaré disparaissent (les biens sont comptés par la
 * relation), et un propriétaire est désormais un particulier ou une société.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('owners', 'kind')) {
            Schema::table('owners', function (Blueprint $table): void {
                $table->string('kind', 20)->default(OwnerKind::Individual->value)->after('uuid');
            });

            // Un propriétaire déjà enregistré sous une raison sociale est une société.
            DB::table('owners')->whereNotNull('company')->where('company', '!=', '')->update(['kind' => OwnerKind::Company->value]);
        }

        // SQLite refuse de supprimer une colonne encore indexée : l'index d'abord.
        foreach (['owners_lead_id_index' => 'lead_id', 'owners_status_index' => 'status'] as $index => $column) {
            if (Schema::hasColumn('owners', $column) && $this->hasIndex($index)) {
                Schema::table('owners', fn (Blueprint $table) => $table->dropIndex($index));
            }
        }

        // SQLite refuse aussi de supprimer une colonne portant une clé étrangère.
        if (Schema::hasColumn('owners', 'lead_id')) {
            Schema::table('owners', fn (Blueprint $table) => $table->dropForeign(['lead_id']));
        }

        foreach (['lead_id', 'status', 'last_contacted_at', 'property_count'] as $column) {
            if (Schema::hasColumn('owners', $column)) {
                Schema::table('owners', fn (Blueprint $table) => $table->dropColumn($column));
            }
        }
    }

    private function hasIndex(string $name): bool
    {
        return collect(Schema::getIndexes('owners'))->contains(fn (array $index): bool => $index['name'] === $name);
    }

    public function down(): void
    {
        Schema::table('owners', function (Blueprint $table): void {
            $table->string('status', 20)->default('to_contact');
            $table->timestamp('last_contacted_at')->nullable();
            $table->unsignedInteger('property_count')->default(1);
            $table->foreignId('lead_id')->nullable()->constrained('leads')->nullOnDelete();
            $table->dropColumn('kind');
        });
    }
};
