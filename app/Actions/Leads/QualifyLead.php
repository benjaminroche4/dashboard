<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Data\LeadInboundMessageData;
use App\Data\LeadVerdictData;
use App\Enums\LeadNoteKind;
use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\LeadNote;
use App\Services\Assistant;
use RuntimeException;

/**
 * Demande à l'assistant IA son avis sur un lead (« AI check ») à partir de
 * tout ce que le lead porte : message d'arrivée (site, appel, SMS), notes de
 * l'équipe et champs déjà connus. L'avis est posé sur le lead, rien d'autre
 * n'est écrit : l'équipe garde la main sur la fiche.
 */
final readonly class QualifyLead
{
    private const string SYSTEM = <<<'TXT'
Tu es l'assistant d'une agence de relocation qui aide des personnes (souvent étrangères, ou en mutation) à trouver un logement à louer à Paris.
On te donne ce qu'un prospect a écrit ou dit en arrivant, les notes de l'équipe et ce qu'elle sait déjà de lui. Rends ton avis sur ce lead, rien d'autre.
- « qualified » : un vrai projet de location à Paris que l'agence peut servir — intention claire, budget mensuel d'au moins 1 100 € (en dessous, une relocation sérieuse n'est pas possible), date d'arrivée plausible, personne joignable.
- « not_qualified » : hors cible (achat, colocation gratuite, démarchage, candidature, spam), budget mensuel sous 1 100 €, ou demande sans suite possible.
- « neutral » : tu n'as pas assez d'éléments pour trancher (message vague, pas de budget ni de projet lisible). Ne devine pas.
- « reason » : pourquoi, en une phrase courte en français, factuelle, que l'équipe lira d'un coup d'œil.
TXT;

    public function __construct(private Assistant $assistant) {}

    /**
     * @return LeadVerdictData|null Null si l'assistant n'est pas configuré ou s'il n'y a rien à lire.
     *
     * @throws RuntimeException si l'API échoue (l'appelant décide : job silencieux ou message à l'équipe)
     */
    public function handle(Lead $lead): ?LeadVerdictData
    {
        if (! $this->assistant->isConfigured()) {
            return null;
        }

        $prompt = self::prompt($lead);

        if ($prompt === null) {
            return null;
        }

        $data = LeadVerdictData::from($this->assistant->extract(self::SYSTEM, $prompt, LeadVerdictData::schema()));

        $lead->forceFill([
            'ai_verdict' => $data->verdict,
            'ai_verdict_reason' => $data->reason,
            'ai_verdict_at' => now(),
        ])->save();

        event(new DashboardUpdated(
            'leads',
            ['id' => $lead->id, 'mentions' => array_filter([$lead->assigned_to])],
            "L'assistant a évalué le lead {$lead->fullName()} : ".mb_strtolower($data->verdict->label()),
        ));

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

        // Les dix notes les plus **récentes**, et seulement celles qui disent
        // quelque chose du client : ce que l'équipe a écrit et ce que le
        // téléphone a rapporté. Le suivi automatique (« Facture RP-… rattachée »)
        // n'apprend rien à l'assistant et diluait le signal ; et lire les dix
        // premières notes, c'était qualifier un lead de deux mois d'après son
        // premier jour.
        $notes = $lead->notes
            ->filter(fn (LeadNote $note): bool => $note->kind === LeadNoteKind::Team || LeadInboundMessageData::isPhoneNote($note))
            ->sortByDesc('created_at')
            ->take(10)
            ->sortBy('created_at')
            ->map(fn (LeadNote $note): string => '- '.$note->body)
            ->implode("\n");
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
