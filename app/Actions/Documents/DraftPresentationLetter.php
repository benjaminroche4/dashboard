<?php

declare(strict_types=1);

namespace App\Actions\Documents;

use App\Enums\EmploymentStatus;
use App\Enums\HouseholdRole;
use App\Enums\TenantSlot;
use App\Models\DocumentRequest;
use App\Models\Lead;
use App\Models\LeadGuarantor;
use App\Services\Assistant;
use RuntimeException;

/**
 * Rédige la lettre de présentation d'un dossier de location : qui est le
 * foyer, ce qu'il fait, ce qu'il cherche, avec quelles garanties — le texte
 * qu'une agence ou un propriétaire lit avant d'ouvrir les pièces. Une
 * proposition, relue et enregistrée par l'équipe avant d'entrer dans le PDF.
 */
final readonly class DraftPresentationLetter
{
    private const string SYSTEM = <<<'TXT'
Tu es l'assistant d'une agence de relocation à Paris. Elle présente le dossier de location d'un de ses clients à une agence immobilière ou à un propriétaire.
Rédige, en français et à la première personne du pluriel au nom de l'agence, une lettre de présentation du foyer : qui sont les locataires, leur situation professionnelle et leurs revenus, les garanties apportées, le logement recherché et la date d'emménagement, et pourquoi ce dossier est solide.
Ton : professionnel, chaleureux, sans flatterie ; phrases courtes. Pas de formule d'appel ni de signature, l'en-tête et le pied du document les portent. N'invente aucun fait : ce qui n'est pas dans les informations fournies n'est pas dans la lettre. Si les revenus valent au moins trois fois le loyer visé, dis-le explicitement. Entre 900 et 1 600 caractères, en trois ou quatre paragraphes séparés par une ligne vide.
TXT;

    public function __construct(private Assistant $assistant) {}

    public function handle(DocumentRequest $request): string
    {
        throw_unless($this->assistant->isConfigured(), RuntimeException::class, 'Assistant IA non configuré (ANTHROPIC_API_KEY).');
        $result = $this->assistant->extract(self::SYSTEM, self::prompt($request), self::schema());

        return trim((string) ($result['letter'] ?? ''));
    }

    /**
     * @return array<string, mixed>
     */
    public static function schema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => ['letter'],
            'properties' => [
                'letter' => ['type' => 'string', 'description' => 'La lettre de présentation, paragraphes séparés par une ligne vide.'],
            ],
        ];
    }

    /** Tout ce que l'agence sait du foyer, sans les coordonnées : la lettre ne les répète pas. */
    public static function prompt(DocumentRequest $request): string
    {
        $request->loadMissing('lead.guarantorPeople');
        $lead = $request->lead;
        $lines = ['Foyer : '.$request->fullName()];

        foreach ($request->persons as $index => $person) {
            $name = trim(($person['first_name'] ?? '').' '.($person['last_name'] ?? ''));
            $role = HouseholdRole::tryFrom($person['role'])?->label() ?? $person['role'];
            $profile = $lead instanceof Lead ? self::profileLine($lead, ApplyDocumentAnalysis::tenantSlot($request, $index)) : null;
            $lines[] = "- {$name}, {$role}".($profile === null ? '' : " : {$profile}");
        }

        if ($lead instanceof Lead) {
            $lines[] = '';
            $lines[] = 'Projet :';
            $lines[] = '- Budget mensuel : '.($lead->budget_cents === null ? 'non précisé' : number_format($lead->budget_cents / 100, 0, ',', ' ').' '.$lead->currency->value);
            $lines[] = '- Emménagement : '.($lead->arrival_at?->locale('fr')->translatedFormat('j F Y') ?? 'non précisé');
            $lines[] = '- Quartiers : '.(($lead->districts ?? []) === [] ? 'non précisés' : implode(', ', array_map(fn (int $d): string => "{$d}e", $lead->districts ?? [])));
            $lines[] = '- Type de bien : '.($lead->property_types?->map(fn ($type): string => $type->label())->implode(', ') ?: 'non précisé');
            $lines[] = '- Meublé : '.($lead->furnished?->label() ?? 'indifférent');
            $lines[] = '- Durée : '.($lead->duration?->label() ?? 'non précisée');

            if ($lead->company !== null) {
                $lines[] = '- Société : '.$lead->company;
            }

            if ($lead->origin_city !== null) {
                $lines[] = '- Vient de : '.$lead->origin_city;
            }

            if ($lead->message !== null && trim($lead->message) !== '') {
                $lines[] = '- Contexte : '.trim($lead->message);
            }

            $guarantees = array_filter([
                $lead->guarantors === null || $lead->guarantors->isEmpty() ? null : 'Garanties annoncées : '.$lead->guarantors->map(fn ($type): string => $type->label())->implode(', '),
                ...$lead->guarantorPeople->map(fn (LeadGuarantor $g): string => 'Garant : '.$g->fullName().self::guarantorLine($g))->all(),
            ]);

            if ($guarantees !== []) {
                $lines[] = '';
                $lines[] = 'Garanties :';
                foreach ($guarantees as $guarantee) {
                    $lines[] = "- {$guarantee}";
                }
            }
        }

        return implode("\n", $lines);
    }

    /** Situation professionnelle et revenu d'un locataire, s'ils sont renseignés. */
    private static function profileLine(Lead $lead, ?TenantSlot $slot): ?string
    {
        if (! $slot instanceof TenantSlot) {
            return null;
        }

        $profile = $lead->tenant_profiles[$slot->value] ?? [];
        $status = EmploymentStatus::tryFrom((string) ($profile['employment_status'] ?? ''));
        $parts = array_filter([
            $status?->label(),
            isset($profile['employer']) && $profile['employer'] !== '' ? 'chez '.$profile['employer'] : null,
            isset($profile['income_cents']) && (int) $profile['income_cents'] > 0 ? number_format((int) $profile['income_cents'] / 100, 0, ',', ' ').' € nets par mois' : null,
            isset($profile['nationality']) && $profile['nationality'] !== '' ? 'nationalité '.$profile['nationality'] : null,
        ]);

        return $parts === [] ? null : implode(', ', $parts);
    }

    private static function guarantorLine(LeadGuarantor $guarantor): string
    {
        $parts = array_filter([
            $guarantor->employment_status?->label(),
            $guarantor->occupation,
            $guarantor->income_cents === null ? null : number_format($guarantor->income_cents / 100, 0, ',', ' ').' € nets par mois',
        ]);

        return $parts === [] ? '' : ' ('.implode(', ', $parts).')';
    }
}
