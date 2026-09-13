<?php

declare(strict_types=1);

use App\Enums\DocumentPreset;
use App\Models\User;
use App\Support\DocumentCatalog;
use Inertia\Testing\AssertableInertia;

test('every piece of every profile exists in the catalog', function (): void {
    $keys = DocumentCatalog::keys();

    foreach (DocumentPreset::cases() as $preset) {
        expect(array_diff($preset->documents(), $keys))
            ->toBe([], "Le profil « {$preset->label()} » demande une pièce absente du catalogue.");
    }
});

test('a profile lists the pieces of its trade, without duplicates', function (): void {
    $freelance = DocumentPreset::Freelance->documents();

    // Le socle commun à tous les profils : identité, logement, présentation.
    expect($freelance)->toContain('identity_document', 'visa_or_residence_permit', 'rib')
        ->toContain('rent_receipts', 'proof_of_address', 'information_sheet', 'presentation_letter')
        // Le métier : 2035, bilans, URSSAF, expert-comptable, Kbis.
        ->toContain('tax_return_2035', 'balance_sheets', 'urssaf_turnover', 'accountant_certificate', 'kbis')
        // Un freelance sans société ne fournit ni statuts ni PV d'assemblée.
        ->not->toContain('company_statutes', 'general_meeting_minutes')
        ->not->toContain('payslips', 'employment_contract', 'student_card');

    foreach (DocumentPreset::cases() as $preset) {
        expect($preset->documents())->toBe(array_values(array_unique($preset->documents())));
    }
});

test('a profile only adds to the one it extends', function (): void {
    // Avec société : les mêmes pièces, plus les statuts et le PV d'assemblée.
    expect(array_values(array_diff(DocumentPreset::FreelanceCompany->documents(), DocumentPreset::Freelance->documents())))
        ->toEqualCanonicalizing(['company_statutes', 'general_meeting_minutes'])
        ->and(array_diff(DocumentPreset::Freelance->documents(), DocumentPreset::FreelanceCompany->documents()))
        ->toBe([]);

    // Stage : la convention en plus. Alternance : le contrat et les fiches de paie.
    expect(array_values(array_diff(DocumentPreset::StudentInternship->documents(), DocumentPreset::Student->documents())))
        ->toEqualCanonicalizing(['internship_agreement'])
        ->and(array_values(array_diff(DocumentPreset::StudentApprenticeship->documents(), DocumentPreset::Student->documents())))
        ->toEqualCanonicalizing(['apprenticeship_contract', 'payslips']);
});

test('the salaried and student profiles carry what their situation proves', function (): void {
    expect(DocumentPreset::Employee->documents())
        ->toContain('payslips', 'employment_contract', 'employer_certificate', 'bonus_letter', 'transfer_letter')
        ->toContain('bank_guarantee', 'visale_certificate', 'garantme_certificate')
        ->not->toContain('kbis', 'tax_return_2035');

    expect(DocumentPreset::Student->documents())
        ->toContain('student_card', 'school_certificate', 'scholarship_certificate', 'apl_certificate')
        ->toContain('visale_certificate', 'third_party_coverage')
        // Un étudiant n'est pas propriétaire : pas de taxe foncière.
        ->not->toContain('property_tax_notice', 'payslips', 'internship_agreement');
});

test('the form offers the profiles, grouped by trade', function (): void {
    $this->actingAs(User::factory()->create())
        ->get(route('tools.documents.create'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->has('presets', count(DocumentPreset::cases()))
            ->where('presets.0.value', 'freelance')
            ->where('presets.0.label', 'Freelance sans société')
            ->where('presets.0.group', 'Indépendant')
            ->has('presets.0.documents', count(DocumentPreset::Freelance->documents()))
            ->where('presets.2.label', 'Salarié'));
});
