<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Issue d'un appel Allo (`data.result` de `call.completed`).
 */
enum PhoneCallResult: string
{
    case Answered = 'ANSWERED';
    case Voicemail = 'VOICEMAIL';
    case TransferredAi = 'TRANSFERRED_AI';
    case TransferredExternal = 'TRANSFERRED_EXTERNAL';
    case Blocked = 'BLOCKED';
    case Failed = 'FAILED';

    public function label(): string
    {
        return match ($this) {
            self::Answered => 'répondu',
            self::Voicemail => 'message vocal',
            self::TransferredAi => 'pris par l\'assistant',
            self::TransferredExternal => 'transféré',
            self::Blocked => 'bloqué',
            self::Failed => 'échoué',
        };
    }

    /** Un appel bloqué ou échoué n'est pas un contact : rien à journaliser. */
    public function isContact(): bool
    {
        return ! in_array($this, [self::Blocked, self::Failed], true);
    }
}
