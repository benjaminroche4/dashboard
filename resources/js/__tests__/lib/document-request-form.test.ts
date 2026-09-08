import { describe, expect, it } from 'vitest';
import {
    countInCategory,
    emptyDocumentRequestForm,
    emptyPerson,
    isCategoryChecked,
    MAX_PERSONS,
    personIndexFromErrorKey,
    personName,
    personStatus,
    toggleCategory,
    toggleDocument,
    validateDocumentRequestForm,
} from '@/lib/document-request-form';
import { catalog, makePersonForm } from '@/test/fixtures/document-request';

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
            upload_url: 'Le lien de dépôt doit être une adresse https valide.',
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
});
