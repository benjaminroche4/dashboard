<?php

declare(strict_types=1);

use App\Enums\ContactFunction;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * La fonction d'un interlocuteur devient une liste fermée : les valeurs déjà
 * saisies en texte libre sont rapprochées d'un cas de l'enum (inconnu →
 * « Autre »), sinon la lecture du modèle casserait.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('partner_contacts')
            ->select(['id', 'position'])
            ->whereNotNull('position')
            ->orderBy('id')
            ->each(function (object $contact): void {
                $parsed = ContactFunction::parse(is_string($contact->position) ? $contact->position : null);

                DB::table('partner_contacts')
                    ->where('id', $contact->id)
                    ->update(['position' => $parsed?->value]);
            });
    }

    public function down(): void
    {
        // Les libellés d'origine ne sont pas conservés : rien à rejouer.
    }
};
