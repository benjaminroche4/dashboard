<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\TransitKind;

/**
 * Un arrêt de transport proche d'un bien, tel que l'assistant le propose puis
 * que l'équipe l'enregistre sur le bien.
 */
final readonly class TransitStopData
{
    /**
     * @param  list<string>  $lines  Lignes desservies, ex. « 2 », « 9 », « 96 »
     */
    public function __construct(
        public TransitKind $kind,
        public string $name,
        public array $lines,
        /** Temps de marche en minutes, quand il est estimé. */
        public ?int $minutes,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function from(array $data): ?self
    {
        $kind = TransitKind::tryFrom(is_string($data['kind'] ?? null) ? $data['kind'] : '');
        $name = trim((string) ($data['name'] ?? ''));

        if ($kind === null || $name === '') {
            return null;
        }

        $minutes = is_numeric($data['minutes'] ?? null) ? (int) $data['minutes'] : null;

        return new self(
            kind: $kind,
            name: mb_substr($name, 0, 120),
            lines: array_values(array_filter(array_map(
                fn (mixed $line): string => mb_substr(trim((string) $line), 0, 12),
                is_array($data['lines'] ?? null) ? $data['lines'] : [],
            ), fn (string $line): bool => $line !== '')),
            minutes: $minutes === null ? null : max(1, min(60, $minutes)),
        );
    }

    /**
     * @return array{kind: string, name: string, lines: list<string>, minutes: int|null}
     */
    public function toArray(): array
    {
        return [
            'kind' => $this->kind->value,
            'name' => $this->name,
            'lines' => $this->lines,
            'minutes' => $this->minutes,
        ];
    }

    /** « Métro Oberkampf · 2, 9 · 4 min à pied ». */
    public function label(): string
    {
        return implode(' · ', array_filter([
            trim($this->kind->label().' '.$this->name),
            $this->lines === [] ? null : implode(', ', $this->lines),
            $this->minutes === null ? null : "{$this->minutes} min à pied",
        ]));
    }
}
