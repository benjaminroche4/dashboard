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

        // La clé étrangère d'abord : MySQL s'appuie sur un index de `lead_id`
        // pour la tenir et refuse qu'on le supprime tant qu'elle existe
        // (erreur 1553). Ensuite seulement les index, SQLite refusant de son
        // côté de supprimer une colonne encore indexée.
        if (Schema::hasColumn('owners', 'lead_id') && $this->hasForeignKey('lead_id')) {
            Schema::table('owners', fn (Blueprint $table) => $table->dropForeign(['lead_id']));
        }

        foreach (['owners_lead_id_index' => 'lead_id', 'owners_status_index' => 'status'] as $index => $column) {
            if (Schema::hasColumn('owners', $column) && $this->hasIndex($index)) {
                Schema::table('owners', fn (Blueprint $table) => $table->dropIndex($index));
            }
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

    /** Vrai si une clé étrangère porte sur cette colonne. */
    private function hasForeignKey(string $column): bool
    {
        return collect(Schema::getForeignKeys('owners'))
            ->contains(fn (array $key): bool => in_array($column, $key['columns'], true));
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
