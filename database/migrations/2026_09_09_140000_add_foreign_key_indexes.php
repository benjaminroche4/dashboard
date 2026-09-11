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
            Schema::table($table, function (Blueprint $blueprint) use ($columns): void {
                foreach ($columns as $column) {
                    $blueprint->index($column);
                }
            });
        }
    }

    public function down(): void
    {
        foreach ($this->indexes as $table => $columns) {
            Schema::table($table, function (Blueprint $blueprint) use ($columns): void {
                foreach ($columns as $column) {
                    $blueprint->dropIndex($column);
                }
            });
        }
    }
};
