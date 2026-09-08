<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Data\LeadInboundMessageData;
use App\Data\LeadQualificationData;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Services\Assistant;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Demande à l'assistant IA de qualifier un lead à partir de ce qu'il a écrit
 * ou dit (formulaire du site, résumé d'appel, SMS, notes). La proposition est
 * stockée sur le lead et attend la relecture d'un membre : rien n'est appliqué ici.
 */
final readonly class QualifyLead
{
    private const string SYSTEM = <<<'TXT'
Tu es l'assistant d'une agence de relocation qui aide des personnes (souvent étrangères, ou en mutation) à trouver un logement à Paris.
On te donne ce qu'un prospect a écrit ou dit en arrivant, et ce que l'équipe sait déjà. Déduis le projet de logement pour préremplir sa fiche. Règles :
- N'invente rien : un champ absent vaut null (ou une liste vide). Ne répète pas ce qui est déjà connu, sauf pour le corriger si le texte le contredit clairement.
- Le budget est le loyer mensuel maximal ; convertis un budget annuel ou hebdomadaire en mensuel. Devise EUR sauf mention explicite de francs suisses (CHF).
- Les arrondissements se déduisent des quartiers cités (Marais → 3 et 4, Saint-Germain → 6, Oberkampf ou Bastille → 11, Batignolles → 17, Montmartre → 18…). Rien si le prospect ne cible aucun quartier.
- « property_types » : studio, t1 à t4 selon le nombre de pièces ou de chambres demandées (2 chambres → t3), grand_appartement au-delà, maison si demandé.
- « duration » : short = moins de 3 mois, medium = 3 à 12 mois, long = 12 mois et plus.
- « score » de 1 à 5 : 5 = projet précis, budget réaliste pour Paris (au moins 1 300 € par mois pour un studio), date d'arrivée proche, coordonnées complètes ; 1 = demande vague, budget très insuffisant ou hors cible (vente, colocation gratuite…). Explique en une phrase dans « score_reason ».
- « summary » : le projet en une ou deux phrases, en français, factuel.
TXT;

    public function __construct(private Assistant $assistant) {}

    /**
     * @return LeadQualificationData|null Null si l'assistant n'est pas configuré ou s'il n'y a rien à lire.
     *
     * @throws RuntimeException si l'API échoue (l'appelant décide : job silencieux ou message à l'équipe)
     */
    public function handle(Lead $lead): ?LeadQualificationData
    {
        if (! $this->assistant->isConfigured()) {
            return null;
        }

        $prompt = self::prompt($lead);

        if ($prompt === null) {
            return null;
        }

        $data = LeadQualificationData::from($this->assistant->extract(self::SYSTEM, $prompt, LeadQualificationData::schema()));

        $lead->forceFill(['ai_qualification' => $data->toArray(), 'ai_qualified_at' => now()])->save();

        if ($data->proposals($lead) !== []) {
            event(new DashboardUpdated('leads', ['id' => $lead->id, 'mentions' => array_filter([$lead->assigned_to])], "L'assistant a qualifié le lead {$lead->fullName()} : à relire"));
        } else {
            Log::info('Qualification IA sans proposition nouvelle.', ['lead' => $lead->id]);
        }

        return $data;
    }

    /** Texte donné à l'assistant : message d'arrivée, notes, et ce que l'équipe sait déjà. Null s'il n'y a rien à lire. */
    public static function prompt(Lead $lead): ?string
    {
        $lead->loadMissing('notes');
        $inbound = LeadInboundMessageData::fromLead($lead);
        $sources = [];

        if ($inbound instanceof LeadInboundMessageData) {
            $sources[] = "Message d'arrivée ({$inbound->meta}) :\n{$inbound->body}";
        } elseif ($lead->message !== null && trim($lead->message) !== '') {
            $sources[] = "Note sur le projet :\n{$lead->message}";
        }

        $notes = $lead->notes->sortBy('created_at')->take(10)->map(fn ($note): string => '- '.$note->body)->implode("\n");
        if ($notes !== '') {
            $sources[] = "Notes de l'équipe :\n{$notes}";
        }

        if ($sources === []) {
            return null;
        }

        $known = array_filter([
            'Nom' => $lead->fullName(),
            'Société' => $lead->company,
            'Langue' => $lead->language->label(),
            'Formule' => $lead->offer?->label(),
            'Budget mensuel' => $lead->budget_cents === null ? null : number_format($lead->budget_cents / 100, 0, ',', ' ').' '.$lead->currency->value,
            'Emménagement' => $lead->arrival_at?->toDateString(),
            'Arrondissements' => ($lead->districts ?? []) === [] ? null : implode(', ', $lead->districts ?? []),
            'Type de bien' => $lead->property_types?->map(fn ($type): string => $type->label())->implode(', ') ?: null,
            'Meublé' => $lead->furnished?->label(),
            'Durée' => $lead->duration?->label(),
            'Ville d’origine' => $lead->origin_city,
        ], fn (mixed $value): bool => $value !== null && $value !== '');

        $knownText = implode("\n", array_map(fn (string $key, string $value): string => "- {$key} : {$value}", array_keys($known), $known));

        return implode("\n\n", [...$sources, "Déjà connu par l'équipe :\n".($knownText === '' ? '- rien' : $knownText), 'Date du jour : '.now()->toDateString()]);
    }
}
