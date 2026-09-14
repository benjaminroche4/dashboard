<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Langues parlées par une agence ou un agent : un client anglophone est mieux
 * servi par un agent qui parle anglais. Le français va de soi et n'est pas listé.
 */
enum SpokenLanguage: string
{
    case English = 'en';
    case Spanish = 'es';
    case German = 'de';
    case Italian = 'it';
    case Portuguese = 'pt';
    case Chinese = 'zh';
    case Arabic = 'ar';
    case Russian = 'ru';
    case Japanese = 'ja';

    public function label(): string
    {
        return match ($this) {
            self::English => 'Anglais',
            self::Spanish => 'Espagnol',
            self::German => 'Allemand',
            self::Italian => 'Italien',
            self::Portuguese => 'Portugais',
            self::Chinese => 'Chinois',
            self::Arabic => 'Arabe',
            self::Russian => 'Russe',
            self::Japanese => 'Japonais',
        };
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(fn (self $case): array => ['value' => $case->value, 'label' => $case->label()], self::cases());
    }
}
