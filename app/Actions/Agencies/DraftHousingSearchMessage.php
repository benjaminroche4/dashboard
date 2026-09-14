<?php

declare(strict_types=1);

namespace App\Actions\Agencies;

use App\Models\Agency;
use App\Models\Agent;
use App\Models\Lead;
use App\Models\User;
use App\Services\Assistant;
use App\Support\HousingSearchFacts;
use RuntimeException;

/**
 * Propose le mot qui accompagne une recherche de logement envoyée à une agence
 * (ou à un agent) : qui cherche quoi, où, pour quand, avec quel dossier. Le
 * conseiller relit avant d'envoyer.
 */
final readonly class DraftHousingSearchMessage
{
    private const string SYSTEM = <<<'TXT'
Tu es l'assistant d'une agence de relocation à Paris. Un conseiller envoie à une agence immobilière partenaire (ou à un agent) la recherche d'un client pour qu'elle propose des biens.
Rédige le mot en français, à la première personne du singulier au nom du conseiller, en 4 à 8 phrases : le client en une ligne (sans son nom de famille ni ses coordonnées, on dit « notre client » ou son prénom), ce qu'il cherche (type, meublé ou vide, quartiers, budget, date d'emménagement, durée), ce qui rassure sur son dossier (situation, garants), et ce qu'on attend de l'agence (des biens à visiter, sous quel délai). Si l'on a déjà travaillé avec cette agence ou cet agent, dis-le en une phrase cordiale. Vouvoiement, ton direct. Commence par « Bonjour, » (ou « Bonjour Prénom, » si l'agent est nommé) et termine par une formule brève suivie du prénom du conseiller. N'invente rien qui ne soit pas dans les informations fournies.
TXT;

    public function __construct(private Assistant $assistant) {}

    public function handle(Lead $lead, ?Agency $agency, ?Agent $agent, User $by): string
    {
        throw_unless($this->assistant->isConfigured(), RuntimeException::class, 'Assistant IA non configuré (ANTHROPIC_API_KEY).');
        $result = $this->assistant->extract(self::SYSTEM, self::prompt($lead, $agency, $agent, $by), self::schema());

        return trim((string) ($result['message'] ?? ''));
    }

    /**
     * @return array<string, mixed>
     */
    public static function schema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => ['message'],
            'properties' => [
                'message' => ['type' => 'string', 'description' => 'Le mot d’accompagnement, prêt à envoyer.'],
            ],
        ];
    }

    public static function prompt(Lead $lead, ?Agency $agency, ?Agent $agent, User $by): string
    {
        $lead->loadMissing('guarantorPeople');
        $visits = $agent instanceof Agent ? $agent->visits()->count() : 0;
        $facts = HousingSearchFacts::for($lead);

        return implode("\n", array_filter([
            "Conseiller : {$by->name}",
            $agency instanceof Agency ? "Agence : {$agency->name}".($agency->city === null ? '' : " ({$agency->city})") : null,
            $agent instanceof Agent ? 'Agent : '.$agent->fullName().($agent->position === null ? '' : ' · '.$agent->position->label()) : null,
            $agent?->relationship_quality === null ? null : 'Relation avec l’agent : '.$agent->relationship_quality->label(),
            $visits === 0 ? null : "Visites déjà faites ensemble : {$visits}",
            '',
            'Client : '.$lead->first_name.($lead->company === null ? '' : " ({$lead->company})"),
            ...array_map(fn (string $label, string $value): string => "{$label} : {$value}", array_keys($facts), $facts),
            $lead->message === null || trim($lead->message) === '' ? null : 'Contexte : '.trim($lead->message),
        ], fn (?string $line): bool => $line !== null));
    }
}
