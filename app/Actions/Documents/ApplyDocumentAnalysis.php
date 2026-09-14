<?php

declare(strict_types=1);

namespace App\Actions\Documents;

use App\Actions\Clients\UpdateTenantProfile;
use App\Data\DocumentAnalysisData;
use App\Data\TenantProfileData;
use App\Enums\HouseholdRole;
use App\Enums\LeadStatus;
use App\Enums\TenantSlot;
use App\Models\DocumentRequest;
use App\Models\DocumentUpload;
use App\Models\Lead;
use App\Models\User;
use RuntimeException;

/**
 * Reporte sur la fiche du locataire ce que l'assistant a lu sur une pièce :
 * date de naissance, nationalité, titre de séjour, employeur, revenu… Seuls les
 * champs **vides** de la fiche sont remplis — ce que l'équipe a saisi n'est
 * jamais écrasé par une lecture automatique.
 */
final readonly class ApplyDocumentAnalysis
{
    public function __construct(private UpdateTenantProfile $updateProfile) {}

    /**
     * @return list<string> Clés de la fiche effectivement remplies
     */
    public function handle(DocumentUpload $upload, ?User $by = null): array
    {
        $upload->loadMissing('request.lead');
        $request = $upload->request;
        $lead = $request->lead;
        $analysis = self::analysis($upload);

        throw_if(! $analysis instanceof DocumentAnalysisData || ! $analysis->hasProfile(), RuntimeException::class, 'L’assistant n’a rien lu d’utile pour la fiche sur cette pièce.');
        throw_if(! $lead instanceof Lead || $lead->status !== LeadStatus::Converted, RuntimeException::class, 'Cette liste n’est rattachée à aucun dossier client.');

        $slot = self::tenantSlot($request, $upload->person_index);
        throw_if(! $slot instanceof TenantSlot, RuntimeException::class, 'Cette pièce est celle d’un garant : seuls les locataires ont une fiche.');
        throw_if($slot === TenantSlot::Co && $lead->co_first_name === null, RuntimeException::class, 'Le dossier n’a pas de second locataire.');

        $current = $lead->tenant_profiles[$slot->value] ?? [];
        $filled = [];
        $merged = $current;

        foreach ($analysis->profile as $key => $value) {
            $column = $key === 'income' ? 'income_cents' : $key;

            if (($current[$column] ?? null) !== null && ($current[$column] ?? '') !== '') {
                continue;
            }

            $merged[$column] = $key === 'income' ? (int) round((float) $value * 100) : $value;
            $filled[] = $key;
        }

        if ($filled === []) {
            return [];
        }

        // Le DTO attend des euros et des chaînes : on repasse par lui pour
        // capitaliser la nationalité et purger le titre d'un citoyen de l'UE.
        $this->updateProfile->handle($lead, $slot, TenantProfileData::from([
            ...$merged,
            'income' => isset($merged['income_cents']) ? $merged['income_cents'] / 100 : null,
        ]), $by);

        return $filled;
    }

    /** Proposition posée sur la pièce, s'il y en a une. */
    public static function analysis(DocumentUpload $upload): ?DocumentAnalysisData
    {
        return $upload->ai_review === null ? null : DocumentAnalysisData::from($upload->ai_review);
    }

    /**
     * Emplacement de la fiche pour une personne de la liste : le premier
     * locataire est le client, le second son co-locataire. Un garant n'en a pas.
     */
    public static function tenantSlot(DocumentRequest $request, int $personIndex): ?TenantSlot
    {
        $tenants = array_keys(array_filter(
            $request->persons,
            fn (array $person): bool => $person['role'] === HouseholdRole::Tenant->value,
        ));
        $position = array_search($personIndex, $tenants, true);

        return match ($position) {
            0 => TenantSlot::Primary,
            1 => TenantSlot::Co,
            default => null,
        };
    }
}
