<?php

declare(strict_types=1);

namespace App\Actions\Agencies;

use App\Data\AgencyEnrichmentData;
use App\Data\AgencyProfileData;
use App\Events\DashboardUpdated;
use App\Models\Agency;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Applique la proposition de l'assistant au profil d'une agence : seuls les
 * champs encore vides sont remplis (ce que l'équipe a saisi prime), les notes
 * lues s'ajoutent aux notes de la fiche, puis la proposition est effacée.
 */
final readonly class ApplyAgencyEnrichment
{
    public function __construct(private UpdateAgencyProfile $update = new UpdateAgencyProfile) {}

    /**
     * @return list<string> champs réellement écrits
     */
    public function handle(Agency $agency, ?User $by = null): array
    {
        $proposal = $agency->ai_profile ?? [];
        if ($proposal === []) {
            return [];
        }

        $current = $agency->only(AgencyEnrichmentData::FIELDS);
        $merged = [];
        $written = [];
        foreach (AgencyEnrichmentData::FIELDS as $field) {
            $existing = $current[$field] ?? null;
            if ($existing instanceof Collection) {
                $existing = $existing->all();
            }
            $proposed = $proposal[$field] ?? null;
            if (($existing === null || $existing === []) && $proposed !== null && $proposed !== [] && $proposed !== '') {
                $merged[$field] = $proposed;
                $written[] = $field;
            } else {
                $merged[$field] = $existing;
            }
        }

        $this->update->handle($agency, AgencyProfileData::from($merged), $by);

        $notes = trim((string) ($proposal['notes'] ?? ''));
        if ($notes !== '' && ! str_contains((string) $agency->notes, $notes)) {
            $agency->notes = trim(($agency->notes ?? '')."\n\n".$notes);
        }

        $agency->forceFill(['ai_profile' => null, 'ai_profile_at' => null])->save();

        event(new DashboardUpdated('agencies', ['id' => $agency->id], "a appliqué le profil proposé pour l'agence {$agency->name}", $by));

        return $written;
    }
}
