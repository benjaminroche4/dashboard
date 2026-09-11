<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Fonction d'un interlocuteur chez un partenaire, choisie dans une liste
 * fermée. Miroir front : resources/js/lib/contact-functions.ts.
 */
enum ContactFunction: string
{
    case Sales = 'sales';
    case AccountManager = 'account_manager';
    case Advisor = 'advisor';
    case Manager = 'manager';
    case Director = 'director';
    case Broker = 'broker';
    case Technician = 'technician';
    case Assistant = 'assistant';
    case Accounting = 'accounting';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Sales => 'Commercial',
            self::AccountManager => 'Chargé de clientèle',
            self::Advisor => 'Conseiller',
            self::Manager => 'Gestionnaire',
            self::Director => 'Directeur',
            self::Broker => 'Courtier',
            self::Technician => 'Technicien',
            self::Assistant => 'Assistant',
            self::Accounting => 'Comptabilité',
            self::Other => 'Autre',
        };
    }

    /**
     * Libellés alternatifs reconnus quand la fonction vient d'un texte libre
     * (données existantes, import).
     *
     * @return list<string>
     */
    public function aliases(): array
    {
        return match ($this) {
            self::Sales => ['commerciale', 'sales', 'business developer'],
            self::AccountManager => ['chargée de clientèle', 'chargé de compte', 'account manager', 'chargé de clientele'],
            self::Advisor => ['conseillère', 'conseiller clientèle', 'conseiller commercial'],
            self::Manager => ['gestionnaire locatif', 'gestionnaire de compte', 'responsable', 'responsable d’agence', "responsable d'agence"],
            self::Director => ['directrice', 'directeur d’agence', "directeur d'agence", 'dirigeant'],
            self::Broker => ['courtière', 'courtier en prêt', 'courtier immobilier'],
            self::Technician => ['technicienne', 'expert', 'inspecteur'],
            self::Assistant => ['assistante', 'assistant commercial', 'secrétaire'],
            self::Accounting => ['comptable', 'compta', 'facturation'],
            self::Other => [],
        };
    }

    /**
     * Reconnaît une fonction écrite à la main : libellé, valeur ou alias.
     * Un texte inconnu mais non vide devient « Autre ».
     */
    public static function parse(?string $value): ?self
    {
        $value = mb_strtolower(trim((string) $value));

        if ($value === '') {
            return null;
        }

        foreach (self::cases() as $case) {
            $known = array_map(
                mb_strtolower(...),
                [$case->value, $case->label(), ...$case->aliases()],
            );

            if (in_array($value, $known, true)) {
                return $case;
            }
        }

        return self::Other;
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $case): array => ['value' => $case->value, 'label' => $case->label()],
            self::cases(),
        );
    }
}
