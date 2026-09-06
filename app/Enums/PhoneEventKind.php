<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Événements de la téléphonie Allo pris en charge (sujets du webhook).
 */
enum PhoneEventKind: string
{
    case CallCompleted = 'call.completed';
    case SmsReceived = 'sms.received';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
