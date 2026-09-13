<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Sépare les notes de suivi (écrites par l'application au fil des actions) des
 * notes que l'équipe écrit pour communiquer. Le défaut est « suivi » : les 39
 * Actions qui posent une note n'ont rien à changer, seule `AddLeadNote` — le
 * seul chemin d'une note humaine — écrit « équipe ».
 */
return new class extends Migration
{
    /**
     * Amorces des notes posées par les Actions. Tout ce qui n'y répond pas est
     * du texte libre, donc une note de l'équipe : on préfère laisser une note
     * de suivi passer pour humaine que perdre une note écrite à la main.
     *
     * @var list<string>
     */
    private const array TRACKING_PREFIXES = [
        'Appel %',
        'SMS reçu%',
        'Bien attribué au dossier :%',
        'Bien libéré :%',
        'Bien rattaché au dossier :%',
        'Compte rendu de la visite du %',
        'Compte rendu de visite envoyé à %',
        'Compte rendu de l’appel vidéo du %',
        "Compte rendu de l'appel vidéo du %",
        'Confirmation de visite envoyée à %',
        'Devis %',
        'Dossier client modifié.',
        'Dossier client ouvert%',
        'Dossier retiré du suivi%',
        'Dossier suivi par %',
        'Dossier suivi aussi par %',
        'Dossier transmis à %',
        'Envoi au lead %',
        'Facture %',
        'Garant ajouté au dossier :%',
        'Garant mis à jour :%',
        'Garant retiré du dossier :%',
        'Lead converti en client%',
        'Lead déplacé dans les %',
        'Lien de dépôt des pièces envoyé à %',
        'Liste de documents de %',
        'Partenaire ajouté :%',
        'Partenaire retiré :%',
        'Personne de suivi ajoutée :%',
        'Personne de suivi mise à jour :%',
        'Personne de suivi retirée :%',
        'Priorité du dossier :%',
        'Propriétaire ajouté à l’annuaire :%',
        "Propriétaire ajouté à l'annuaire :%",
        'Qualification IA %',
        'Revenus du foyer %',
        'Second locataire %',
        'Second membre du suivi %',
        'Visio %',
        'Visite planifiée le %',
        // Suite donnée à un bien : « <nom du bien> : <état>. »
        '% : À décider.',
        '% : Ne se positionne pas.',
        '% : Dossier déposé.',
        '% : Dossier accepté.',
        '% : Dossier refusé.',
    ];

    public function up(): void
    {
        if (! Schema::hasColumn('lead_notes', 'kind')) {
            Schema::table('lead_notes', function (Blueprint $table): void {
                $table->string('kind', 20)->default('tracking')->after('body');
            });
        }

        // Reprise des notes déjà écrites : tout passe en « équipe », puis les
        // amorces connues des Actions repassent en « suivi ».
        DB::table('lead_notes')->update(['kind' => 'team']);

        foreach (self::TRACKING_PREFIXES as $prefix) {
            DB::table('lead_notes')->where('body', 'like', $prefix)->update(['kind' => 'tracking']);
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('lead_notes', 'kind')) {
            Schema::table('lead_notes', function (Blueprint $table): void {
                $table->dropColumn('kind');
            });
        }
    }
};
