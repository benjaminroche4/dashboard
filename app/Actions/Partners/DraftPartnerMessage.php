<?php

declare(strict_types=1);

namespace App\Actions\Partners;

use App\Models\LeadPartner;
use App\Models\User;
use App\Services\Assistant;
use RuntimeException;

/**
 * Propose le mot d'accompagnement d'un dossier transmis à un partenaire
 * (assureur, banque, déménageur…) : ce qu'on lui demande, pour qui, et
 * quand. Le conseiller relit avant d'envoyer.
 */
final readonly class DraftPartnerMessage
{
    private const string SYSTEM = <<<'TXT'
Tu es l'assistant d'une agence de relocation à Paris. Un conseiller transmet le dossier d'un client à un partenaire et a besoin d'un court mot d'accompagnement.
Rédige-le en français, à la première personne du singulier au nom du conseiller, en 3 à 6 phrases : qui est le client en une ligne, ce qu'on attend précisément du partenaire compte tenu de son rôle sur ce dossier, et l'échéance si elle est connue. Vouvoiement, ton direct et cordial. Commence par « Bonjour, » et termine par une formule brève suivie du prénom du conseiller. N'invente rien qui ne soit pas dans les informations fournies.
TXT;

    public function __construct(private Assistant $assistant) {}

    public function handle(LeadPartner $link, User $by): string
    {
        throw_unless($this->assistant->isConfigured(), RuntimeException::class, 'Assistant IA non configuré (ANTHROPIC_API_KEY).');
        $result = $this->assistant->extract(self::SYSTEM, self::prompt($link, $by), self::schema());

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

    public static function prompt(LeadPartner $link, User $by): string
    {
        $link->loadMissing(['lead', 'partner']);
        $lead = $link->lead;
        $partner = $link->partner;

        return implode("\n", array_filter([
            "Conseiller : {$by->name}",
            "Partenaire : {$partner->name} (".$partner->type->label().')',
            'Rôle du partenaire sur ce dossier : '.$link->role->label(),
            $link->note === null || trim($link->note) === '' ? null : 'Note sur ce partenariat : '.trim($link->note),
            '',
            'Client : '.$lead->fullName().($lead->company === null ? '' : " ({$lead->company})"),
            $lead->offer === null ? null : 'Formule : '.$lead->offer->label(),
            $lead->arrival_at === null ? null : 'Emménagement prévu : '.$lead->arrival_at->locale('fr')->translatedFormat('j F Y'),
            $lead->budget_cents === null ? null : 'Budget mensuel : '.number_format($lead->budget_cents / 100, 0, ',', ' ').' '.$lead->currency->value,
            ($lead->districts ?? []) === [] ? null : 'Quartiers : '.implode(', ', array_map(fn (int $d): string => "{$d}e", $lead->districts ?? [])),
            $lead->origin_city === null ? null : 'Vient de : '.$lead->origin_city,
            $lead->message === null || trim($lead->message) === '' ? null : 'Contexte : '.trim($lead->message),
        ], fn (?string $line): bool => $line !== null));
    }
}
