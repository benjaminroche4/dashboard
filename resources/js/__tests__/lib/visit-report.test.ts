import { describe, expect, it } from 'vitest';
import {
    initialReportForm,
    REPORT_MIN_LENGTH,
    reportPayload,
    validateReportForm,
} from '@/lib/visit-report';
import { makeVisit } from '@/test/fixtures/visit';

describe('initialReportForm', () => {
    it('repart du compte rendu écrit et de l’étape en cours', () => {
        expect(
            initialReportForm(
                makeVisit({ report: 'Très lumineux.' }),
                'applied',
            ),
        ).toEqual({ report: 'Très lumineux.', next_status: 'applied' });
    });

    it('part vide quand rien n’a été écrit', () => {
        expect(initialReportForm(makeVisit({ report: null }))).toEqual({
            report: '',
            next_status: '',
        });
    });
});

describe('validateReportForm', () => {
    it('exige des impressions un peu étoffées', () => {
        expect(
            validateReportForm({ report: 'Court', next_status: '' }).report,
        ).toContain(String(REPORT_MIN_LENGTH));
        // L'étape, elle, reste facultative : on peut écrire sans trancher.
        expect(
            validateReportForm({
                report: 'Visite faite, le client hésite encore.',
                next_status: '',
            }),
        ).toEqual({});
    });
});

describe('reportPayload', () => {
    it('nettoie le texte et porte l’étape choisie', () => {
        expect(
            reportPayload({
                report: '  Cuisine à refaire.  ',
                next_status: 'declined',
            }),
        ).toEqual({ report: 'Cuisine à refaire.', next_status: 'declined' });
    });
});
