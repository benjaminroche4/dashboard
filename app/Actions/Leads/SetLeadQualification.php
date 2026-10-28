<?php

declare(strict_types=1);

namespace App\Actions\Leads;

use App\Events\DashboardUpdated;
use App\Models\Lead;

/**
 * Pose la qualité du lead (note sur 5) et sa note de qualification depuis la
 * fiche, sans passer par la page de modification. Rien n'est enregistré ni
 * diffusé quand rien ne change.
 */
final class SetLeadQualification
{
    public function handle(Lead $lead, ?int $score, ?string $note): Lead
    {
        $note = trim((string) $note);
        $note = $note === '' ? null : $note;

        if ($lead->score === $score && $lead->qualification_note === $note) {
            return $lead;
        }

        $scoreChanged = $lead->score !== $score;
        $lead->score = $score;
        $lead->qualification_note = $note;
        $lead->save();

        $message = $scoreChanged
            ? ($score === null
                ? "a retiré la note du lead {$lead->fullName()}"
                : "a noté le lead {$lead->fullName()} {$score} / 5")
            : "a mis à jour la note de qualification du lead {$lead->fullName()}";
        event(new DashboardUpdated('leads', ['id' => $lead->id], $message));

        return $lead;
    }
}
