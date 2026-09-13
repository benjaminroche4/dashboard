import { describe, expect, it } from 'vitest';
import {
    countInCategory,
    groupPresets,
    isPresetApplied,
    togglePreset,
    emptyDocumentRequestForm,
    emptyPerson,
    isCategoryChecked,
    MAX_PERSONS,
    personIndexFromErrorKey,
    personName,
    personStatus,
    prefillFromLead,
    toggleCategory,
    toggleDocument,
    validateDocumentRequestForm,
} from '@/lib/document-request-form';
import {
    catalog,
    documentPresets,
    documentRequestLeads,
    makePersonForm,
} from '@/test/fixtures/document-request';

const identity = catalog[0]!;

describe('document request form helpers', () => {
    it('toggles a document without duplicates', () => {
        let person = emptyPerson();
        person = toggleDocument(person, 'payslips', true);
        person = toggleDocument(person, 'payslips', true);
        expect(person.documents).toEqual(['payslips']);

        person = toggleDocument(person, 'payslips', false);
        expect(person.documents).toEqual([]);
    });

    it('checks a whole category, then unchecks it when already complete', () => {
        let person = toggleDocument(emptyPerson(), 'payslips', true);

        person = toggleCategory(person, identity);
        expect(isCategoryChecked(person, identity)).toBe(true);
        expect(countInCategory(person, identity)).toBe(2);
        expect(person.documents).toContain('payslips');

        person = toggleCategory(person, identity);
        expect(isCategoryChecked(person, identity)).toBe(false);
        expect(person.documents).toEqual(['payslips']);
    });

    it('ticks a profile without losing what was already ticked, and unticks it on a second click', () => {
        const [freelance, withCompany, employee] = documentPresets;
        let person = toggleDocument(emptyPerson(), 'family_record_book', true);

        person = togglePreset(person, freelance!);
        expect(person.documents).toEqual([
            'family_record_book',
            'identity_document',
            'employment_contract',
        ]);
        expect(isPresetApplied(person, freelance!)).toBe(true);
        // « Avec société » demande une pièce de plus, cochée à la main ici :
        // il compte donc pour coché, ses pièces étant toutes présentes.
        expect(isPresetApplied(person, withCompany!)).toBe(true);
        expect(isPresetApplied(person, employee!)).toBe(false);

        // Un second profil ajoute ses pièces aux précédentes.
        person = togglePreset(person, employee!);
        expect(person.documents).toContain('payslips');

        // Second clic sur le premier profil : seules ses pièces repartent, la
        // pièce cochée à la main et celles de l'autre profil restent.
        person = togglePreset(person, freelance!);
        expect(person.documents).toEqual(['family_record_book', 'payslips']);
        expect(isPresetApplied(person, freelance!)).toBe(false);
    });

    it('groups the profiles by trade, in the order given by the server', () => {
        expect(
            groupPresets(documentPresets).map((family) => [
                family.group,
                family.presets.map((preset) => preset.value),
            ]),
        ).toEqual([
            ['Indépendant', ['freelance', 'freelance_company']],
            ['Salarié', ['employee']],
        ]);
        expect(groupPresets([])).toEqual([]);
    });

    it('names a person, falling back to its number', () => {
        expect(personName(emptyPerson(), 1)).toBe('Personne 2');
        expect(personName(makePersonForm({ first_name: ' Léa ' }), 0)).toBe(
            'Léa Martin',
        );
        expect(
            personName({ first_name: 'jean-pierre', last_name: 'ROCHE' }, 0),
        ).toBe('Jean-Pierre Roche');
    });

    it('describes the person status for the summary', () => {
        expect(personStatus(emptyPerson())).toEqual({
            label: 'Aucune pièce',
            complete: false,
        });
        expect(personStatus(makePersonForm({ documents: ['a'] })).label).toBe(
            '1 pièce',
        );
        expect(personStatus(makePersonForm({ documents: ['a', 'b'] }))).toEqual(
            { label: '2 pièces', complete: true },
        );
        expect(
            personStatus(makePersonForm({ last_name: '', documents: ['a'] })),
        ).toEqual({ label: '1 pièce · nom manquant', complete: false });
    });

    it('finds the person targeted by an error key', () => {
        expect(personIndexFromErrorKey('persons.2.first_name')).toBe(2);
        expect(personIndexFromErrorKey('persons.0.documents')).toBe(0);
        expect(personIndexFromErrorKey('upload_url')).toBeNull();
        expect(personIndexFromErrorKey('persons')).toBeNull();
    });

    it('validates each person, the optional https link and the household size', () => {
        const form = emptyDocumentRequestForm();

        expect(validateDocumentRequestForm(form)).toEqual({
            'persons.0.first_name': 'Le prénom est obligatoire.',
            'persons.0.last_name': 'Le nom est obligatoire.',
            'persons.0.documents':
                'Cochez au moins une pièce pour cette personne.',
        });

        expect(
            validateDocumentRequestForm({
                ...form,
                upload_url: 'http://insecure.example',
                persons: [
                    makePersonForm({ documents: ['rib'] }),
                    makePersonForm({ first_name: ' ', documents: ['rib'] }),
                ],
            }),
        ).toEqual({
            upload_url:
                'Le dossier Google Drive doit être une adresse https valide.',
            'persons.1.first_name': 'Le prénom est obligatoire.',
        });

        expect(
            validateDocumentRequestForm({
                ...form,
                upload_url: 'https://drive.google.com/x',
                persons: Array.from({ length: MAX_PERSONS + 1 }, () =>
                    makePersonForm({ documents: ['rib'] }),
                ),
            }),
        ).toEqual({ persons: 'Quatre personnes au maximum.' });

        expect(
            validateDocumentRequestForm({
                ...form,
                upload_url: 'https://drive.google.com/x',
                persons: [
                    makePersonForm({ role: 'guarantor', documents: ['rib'] }),
                ],
            }),
        ).toEqual({});
    });
    it('prefills the household from a lead, one person per physical guarantor', () => {
        const lead = documentRequestLeads[0]!; // Léa Martin, garant physique + Garantme
        const filled = prefillFromLead(emptyDocumentRequestForm(), lead);

        expect(filled.language).toBe('fr');
        expect(filled.persons).toHaveLength(2);
        expect(filled.persons[0]).toMatchObject({
            first_name: 'Léa',
            last_name: 'Martin',
            role: 'tenant',
        });
        // Garantme et la garantie bancaire ne sont pas des personnes du foyer.
        expect(filled.persons[1]).toMatchObject({ role: 'guarantor' });
    });

    it('keeps what is already typed and never exceeds four persons', () => {
        const lead = documentRequestLeads[0]!;
        const typed = {
            ...emptyDocumentRequestForm(),
            persons: [
                makePersonForm({ first_name: 'Marc', last_name: 'Dubois' }),
                makePersonForm({ role: 'guarantor' }),
            ],
        };

        const filled = prefillFromLead(typed, lead);

        // La personne déjà nommée est conservée, le lead devient une personne de plus.
        expect(filled.persons[0]).toMatchObject({ first_name: 'Marc' });
        expect(filled.persons.map((person) => person.role)).toEqual([
            'tenant',
            'guarantor',
            'tenant',
        ]);

        const full = prefillFromLead(
            {
                ...emptyDocumentRequestForm(),
                persons: Array.from({ length: MAX_PERSONS }, () =>
                    makePersonForm({ first_name: 'Marc' }),
                ),
            },
            lead,
        );
        expect(full.persons).toHaveLength(MAX_PERSONS);
    });

    it('adds no guarantor when the lead declares none', () => {
        const lead = documentRequestLeads[1]!; // John Smith, anglais, sans garant
        const filled = prefillFromLead(emptyDocumentRequestForm(), lead);

        expect(filled.language).toBe('en');
        expect(filled.persons).toHaveLength(1);
    });
});
