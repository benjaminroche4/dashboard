import { describe, expect, it } from 'vitest';
import {
    dossierFileName,
    dossierPlan,
    dossierWeight,
} from '@/lib/document-dossier';
import {
    makeDocumentRequestDetail,
    makeDocumentUpload,
} from '@/test/fixtures/document-request';

/** Liste à deux personnes : un garant en premier dans les props, un locataire ensuite. */
const request = makeDocumentRequestDetail({
    name: 'Léa Martin',
    uploads_count: 4,
    persons: [
        {
            name: 'Paul Martin',
            role: 'Garant',
            categories: [
                {
                    value: 'identity',
                    label: 'Identité',
                    documents: [
                        {
                            key: 'identity_document',
                            label: "Passeport ou carte d'identité",
                            hint: null,
                            uploads: [
                                makeDocumentUpload({
                                    id: 1,
                                    name: 'cni-paul.pdf',
                                }),
                            ],
                        },
                    ],
                },
            ],
        },
        {
            name: 'Léa Martin',
            role: 'Locataire',
            categories: [
                {
                    value: 'identity',
                    label: 'Identité',
                    documents: [
                        {
                            key: 'identity_document',
                            label: "Passeport ou carte d'identité",
                            hint: null,
                            // Deux fichiers pour une pièce : l'ordre de dépôt est gardé.
                            uploads: [
                                makeDocumentUpload({
                                    id: 2,
                                    name: 'recto.pdf',
                                }),
                                makeDocumentUpload({
                                    id: 3,
                                    name: 'verso.pdf',
                                }),
                            ],
                        },
                        {
                            key: 'family_record_book',
                            label: 'Livret de famille',
                            hint: null,
                            // Pièce demandée mais pas déposée : absente du dossier.
                            uploads: [],
                        },
                    ],
                },
                {
                    value: 'work',
                    label: 'Travail',
                    documents: [
                        {
                            key: 'payslips',
                            label: '3 derniers bulletins de salaire',
                            hint: null,
                            uploads: [
                                makeDocumentUpload({
                                    id: 4,
                                    name: 'paie.pdf',
                                    size: 100_000,
                                }),
                            ],
                        },
                    ],
                },
            ],
        },
    ],
});

describe('dossierPlan', () => {
    it('orders the dossier: tenants first, then the catalogue, then the uploads', () => {
        const parts = dossierPlan(request);

        expect(
            parts.map((part) => [part.person, part.document, part.upload.name]),
        ).toEqual([
            // Le locataire passe devant le garant, même listé après.
            ['Léa Martin', "Passeport ou carte d'identité", 'recto.pdf'],
            ['Léa Martin', "Passeport ou carte d'identité", 'verso.pdf'],
            ['Léa Martin', '3 derniers bulletins de salaire', 'paie.pdf'],
            ['Paul Martin', "Passeport ou carte d'identité", 'cni-paul.pdf'],
        ]);
        expect(parts[0]?.category).toBe('Identité');
        expect(parts[2]?.category).toBe('Travail');
    });

    it('leaves out the pieces that were never deposited', () => {
        expect(dossierPlan(request).map((part) => part.document)).not.toContain(
            'Livret de famille',
        );
        expect(dossierPlan(makeDocumentRequestDetail())).toEqual([]);
    });

    it('leaves out the files the team refused: they are not valid', () => {
        const refused = makeDocumentRequestDetail({
            persons: structuredClone(request.persons),
        });
        refused.persons[1]!.categories[0]!.documents[0]!.uploads = [
            makeDocumentUpload({ id: 2, name: 'recto.pdf' }),
            makeDocumentUpload({
                id: 3,
                name: 'verso.pdf',
                status: 'refused',
                status_label: 'Refusée',
                review_note: 'Illisible.',
            }),
        ];

        expect(dossierPlan(refused).map((part) => part.upload.name)).toEqual([
            'recto.pdf',
            'paie.pdf',
            'cni-paul.pdf',
        ]);
    });

    it('adds up the weight of what will be merged', () => {
        // 3 × 245 000 (fixture) + 100 000.
        expect(dossierWeight(dossierPlan(request))).toBe(835_000);
        expect(dossierWeight([])).toBe(0);
    });
});

describe('dossierFileName', () => {
    it('names the file after the client, without accent nor space', () => {
        expect(dossierFileName('Léa Martin')).toBe('dossier-lea-martin.pdf');
        expect(dossierFileName('Bruno & Charles')).toBe(
            'dossier-bruno-charles.pdf',
        );
        expect(dossierFileName('  ')).toBe('dossier-client.pdf');
    });
});
