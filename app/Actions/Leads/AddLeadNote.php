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

        // Le nom le plus long l'emporte à une même position : « @Admin 2 » ne
        // mentionne pas « Admin », et « @Admin, » mentionne bien « Admin ».
        $users = User::query()
            ->get(['id', 'name'])
            ->filter(fn (User $user): bool => $user->id !== $by?->id)
            ->sortByDesc(fn (User $user): int => mb_strlen($user->name));

        $consumed = [];
        $mentioned = [];

        foreach ($users as $user) {
            preg_match_all('/@'.preg_quote($user->name, '/').'(?![\p{L}\p{N}])/u', $body, $matches, PREG_OFFSET_CAPTURE);

            foreach ($matches[0] as [$match, $offset]) {
                $end = $offset + strlen($match);
                $overlaps = array_filter($consumed, fn (array $span): bool => $offset < $span[1] && $end > $span[0]);

                if ($overlaps === []) {
                    $consumed[] = [$offset, $end];
                    $mentioned[$user->id] = $user->name;
                }
            }
        }

        asort($mentioned);

        return array_keys($mentioned);
    }
}
