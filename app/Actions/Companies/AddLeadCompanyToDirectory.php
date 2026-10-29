<?php

declare(strict_types=1);

namespace App\Actions\Companies;

use App\Data\CompanyData;
use App\Events\DashboardUpdated;
use App\Models\Company;
use App\Models\Lead;
use App\Models\User;
use App\Support\CompanyName;
use Illuminate\Validation\ValidationException;

/**
 * Fait entrer la société d'un lead dans l'annuaire des entreprises, depuis
 * sa fiche, sans ressaisie : une entreprise du même nom est reprise, sinon
 * elle est créée avec sa raison sociale seule, et le lead lui est rattaché
 * (`leads.company_id`), qu'il soit client ou encore en cours. Sans effet si
 * le lead est déjà rattaché.
 */
final readonly class AddLeadCompanyToDirectory
{
    public function __construct(private CreateCompany $create) {}

    public function handle(Lead $lead, ?User $by = null): Company
    {
        $existing = $lead->companyEntry()->first();

        if ($existing !== null) {
            return $existing;
        }

        $name = trim((string) $lead->company);

        if ($name === '') {
            throw ValidationException::withMessages(['company' => __('Le lead n’a pas de société à ajouter.')]);
        }

        // Une entreprise déjà connue sous une orthographe voisine (« Nestlé
        // S.A. », « NESTLE SA », « Nestle ») est reprise, jamais dupliquée.
        $company = self::similar($name)
            ?? $this->create->handle(CompanyData::from(['name' => $name]), $by);

        $lead->forceFill(['company_id' => $company->id])->save();
        $lead->notes()->create(['body' => "Société ajoutée à l'annuaire des entreprises : {$company->name}.", 'user_id' => $by?->id]);

        event(new DashboardUpdated('companies', ['id' => $company->id, 'lead_id' => $lead->id], "a rattaché le lead {$lead->fullName()} à l'entreprise {$company->name}", $by));

        return $company;
    }

    /** Entreprise de l'annuaire dont la raison sociale se rapproche de `$name`, le nom exact d'abord. */
    public static function similar(string $name): ?Company
    {
        $exact = Company::query()->named($name)->first();

        if ($exact !== null) {
            return $exact;
        }

        return Company::query()->orderBy('name')->get(['id', 'uuid', 'name'])
            ->first(fn (Company $company): bool => CompanyName::similar($company->name, $name));
    }
}
