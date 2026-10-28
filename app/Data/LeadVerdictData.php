<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\LeadVerdict;

/**
 * L'avis de l'assistant IA sur un lead (« AI check ») : qualifié, non
 * qualifié, ou neutre quand il n'a pas de quoi trancher, avec son motif en
 * une phrase. C'est tout ce que l'analyse rend : aucune proposition de
 * champ, l'équipe garde la main sur la fiche (décision du 28 octobre 2026).
 */
final readonly class LeadVerdictData
{
    public function __construct(
        public LeadVerdict $verdict,
        public ?string $reason,
    ) {}

    /**
     * Schéma JSON demandé à l'assistant.
     *
     * @return array<string, mixed>
     */
    public static function schema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => ['verdict', 'reason'],
            'properties' => [
                'verdict' => [
                    'type' => 'string',
                    'enum' => array_map(fn (LeadVerdict $case): string => $case->value, LeadVerdict::cases()),
                    'description' => 'qualified = un vrai projet de relocation à Paris que l’agence peut servir ; not_qualified = hors cible, budget sous le minimum ou demande sans suite possible ; neutral = pas assez d’éléments pour trancher',
                ],
                'reason' => [
                    'type' => 'string',
                    'description' => 'Pourquoi, en une phrase courte en français, lisible par l’équipe (300 caractères au plus)',
                ],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $data  Réponse de l'assistant ; un avis inconnu vaut « neutre »
     */
    public static function from(array $data): self
    {
        $reason = trim((string) ($data['reason'] ?? ''));

        return new self(
            verdict: LeadVerdict::tryFrom((string) ($data['verdict'] ?? '')) ?? LeadVerdict::Neutral,
            reason: $reason === '' ? null : mb_substr($reason, 0, 300),
        );
    }

    /**
     * @return array{verdict: string, reason: string|null}
     */
    public function toArray(): array
    {
        return ['verdict' => $this->verdict->value, 'reason' => $this->reason];
    }
}
