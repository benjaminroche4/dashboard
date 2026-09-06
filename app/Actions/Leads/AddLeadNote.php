<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Events\DashboardUpdated;
use App\Models\Lead;
use App\Models\LeadNote;
use App\Models\User;

/**
 * Ajoute une note interne sur un lead.
 */
final class AddLeadNote
{
    public function handle(Lead $lead, string $body, ?User $by = null): LeadNote
    {
        $note = $lead->notes()->create(['body' => $body, 'user_id' => $by?->id]);
        $mentions = self::mentionedUserIds($body, $by);

        event(new DashboardUpdated(
            'leads',
            ['id' => $lead->id, 'mentions' => $mentions],
            $mentions === []
                ? "a annoté le lead {$lead->fullName()}"
                : "vous a mentionné dans une note sur le lead {$lead->fullName()}",
        ));

        return $note;
    }

    /**
     * Identifiants des membres cités par « @Prénom Nom » dans la note (hors auteur).
     *
     * @return list<int>
     */
    public static function mentionedUserIds(string $body, ?User $by = null): array
    {
        if (! str_contains($body, '@')) {
            return [];
        }

        return array_values(User::query()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->filter(fn (User $user): bool => $user->id !== $by?->id && str_contains($body, '@'.$user->name))
            ->map(fn (User $user): int => $user->id)
            ->all());
    }
}
