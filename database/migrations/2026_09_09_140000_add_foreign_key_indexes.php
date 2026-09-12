<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Postgres n'indexe pas les clés étrangères : toutes les vues qui filtrent par
 * responsable, par lead ou par bien (Mon travail, fiche d'un agent, visites
 * d'un dossier, biens d'un propriétaire) balayaient la table entière. Les
 * colonnes de tri des annuaires sont indexées au passage.
 */
return new class extends Migration
{
    /** @var array<string, list<string|list<string>>> */
    private array $indexes = [
        'leads' => ['assigned_to', 'co_assigned_to', 'agent_id', 'created_by', ['assigned_to', 'recontact_at']],
        'visits' => ['lead_id', 'property_id', 'agent_id', 'assigned_to', 'created_by', ['status', 'scheduled_at']],
        'properties' => ['agent_id', 'owner_id', 'created_by'],
        'owners' => ['lead_id', 'created_by'],
        'partners' => ['created_by', 'name'],
        'agents' => ['agency_id', 'created_by', 'last_name'],
        'agencies' => ['created_by', 'name'],
        'quotes' => ['lead_id', 'created_by'],
        'invoices' => ['lead_id', 'created_by'],
        'document_requests' => ['lead_id', 'created_by'],
    ];

    public function up(): void
    {
        foreach ($this->indexes as $table => $columns) {
            foreach ($columns as $column) {
                $name = $table.'_'.implode('_', (array) $column).'_index';

                // Un déploiement interrompu rejoue la migration : un index déjà
                // posé ne doit pas la faire échouer.
                if ($this->hasIndex($table, $name)) {
                    continue;
                }

                Schema::table($table, fn (Blueprint $blueprint) => $blueprint->index($column));
            }
        }
    }

    public function down(): void
    {
        foreach ($this->indexes as $table => $columns) {
            foreach ($columns as $column) {
                // MySQL refuse de supprimer l'index qui tient une clé étrangère
                // (erreur 1553) : sur ces colonnes-là, l'index doit rester.
                if (is_string($column) && $this->backsForeignKey($table, $column)) {
                    continue;
                }

                $name = $table.'_'.implode('_', (array) $column).'_index';

                // Un retour en arrière rejoué ne doit pas échouer sur un index
                // déjà tombé.
                if (! $this->hasIndex($table, $name)) {
                    continue;
                }

                Schema::table($table, fn (Blueprint $blueprint) => $blueprint->dropIndex($name));
            }
        }
    }

    private function hasIndex(string $table, string $name): bool
    {
        return collect(Schema::getIndexes($table))->contains(fn (array $index): bool => $index['name'] === $name);
    }

    /** Vrai si une clé étrangère de la table porte sur cette seule colonne. */
    private function backsForeignKey(string $table, string $column): bool
    {
        return collect(Schema::getForeignKeys($table))
            ->contains(fn (array $key): bool => $key['columns'] === [$column]);
    }
};
