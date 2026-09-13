<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Suite donnée à un bien visité, pour un dossier client : le client se
 * positionne ou non, puis le dossier de candidature est accepté ou refusé.
 */
enum PropertyApplicationStatus: string
{
    /** Visite faite, le client n'a pas tranché. */
    case Pending = 'pending';

    /** Le client ne se positionne pas sur ce bien. */
    case Declined = 'declined';

    /** Dossier de candidature déposé auprès de l'agence ou du propriétaire. */
    case Applied = 'applied';

    case Accepted = 'accepted';

    case Rejected = 'rejected';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'À décider',
            self::Declined => 'Ne se positionne pas',
            self::Applied => 'Dossier déposé',
            self::Accepted => 'Dossier accepté',
            self::Rejected => 'Dossier refusé',
        };
    }

    /** Ce que l'étape veut dire, sous le libellé du menu. */
    public function hint(): string
    {
        return match ($this) {
            self::Pending => 'Le client n’a pas encore décidé.',
            self::Declined => 'Le bien ne l’intéresse pas après visite.',
            self::Applied => 'La candidature est partie, en attente de réponse.',
            self::Accepted => 'Le bien est obtenu.',
            self::Rejected => 'La candidature n’a pas été retenue.',
        };
    }

    /** Le bien est hors course : le client a dit non, ou le dossier a été refusé. */
    public function isOut(): bool
    {
        return $this === self::Declined || $this === self::Rejected;
    }

    /** Une candidature est en jeu (déposée, acceptée). */
    public function isApplication(): bool
    {
        return $this === self::Applied || $this === self::Accepted;
    }

    /**
     * @return list<array{value: string, label: string, hint: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $case): array => ['value' => $case->value, 'label' => $case->label(), 'hint' => $case->hint()],
            self::cases(),
        );
    }
}
