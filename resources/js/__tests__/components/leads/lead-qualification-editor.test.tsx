import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { patch } = vi.hoisted(() => ({ patch: vi.fn() }));
vi.mock('@inertiajs/react', () => ({ router: { patch } }));

import { LeadQualificationEditor } from '@/components/leads/lead-qualification-editor';
import { makeLeadDetail } from '@/test/fixtures/lead';

describe('LeadQualificationEditor', () => {
    // Le serveur simulé répond aussitôt : `onFinish` rend la main au composant.
    const answer = () =>
        patch.mockImplementation(
            (
                _url: string,
                _data: unknown,
                options?: { onFinish?: () => void },
            ) => options?.onFinish?.(),
        );

    beforeEach(() => {
        patch.mockReset();
        answer();
    });

    it('scores the lead with a click on a star, and a second click on the same star clears it', async () => {
        const user = userEvent.setup();
        const lead = makeLeadDetail({
            uuid: 'lead-1',
            score: null,
            qualification_note: null,
        });
        render(<LeadQualificationEditor lead={lead} />);

        expect(screen.getByTestId('lead-score-label')).toHaveTextContent(
            'Pas encore notée',
        );
        const stars = screen.getAllByRole('radio');
        expect(stars).toHaveLength(5);
        await user.click(screen.getByRole('radio', { name: '4 sur 5 · Bon' }));

        expect(patch).toHaveBeenCalledWith(
            '/locataires/lead-1/qualification',
            { score: 4, qualification_note: '' },
            expect.objectContaining({ preserveScroll: true }),
        );

        patch.mockReset();
        render(<LeadQualificationEditor lead={{ ...lead, score: 4 }} />);
        const [checked] = screen.getAllByRole('radio', { checked: true });
        expect(checked).toHaveAccessibleName('4 sur 5 · Bon');
        await user.click(checked);
        expect(patch).toHaveBeenCalledWith(
            '/locataires/lead-1/qualification',
            { score: null, qualification_note: '' },
            expect.anything(),
        );
    });

    it('saves the note only when it changed, with the button or ⌘Entrée, and keeps the score', async () => {
        const user = userEvent.setup();
        render(
            <LeadQualificationEditor
                lead={makeLeadDetail({
                    uuid: 'lead-1',
                    score: 3,
                    qualification_note: 'Budget solide.',
                })}
            />,
        );

        const field = screen.getByLabelText('Note de qualification');
        expect(field).toHaveValue('Budget solide.');
        expect(
            screen.queryByRole('button', { name: 'Enregistrer' }),
        ).not.toBeInTheDocument();

        await user.type(field, ' Arrive en mars.');
        await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
        expect(patch).toHaveBeenCalledWith(
            '/locataires/lead-1/qualification',
            { score: 3, qualification_note: 'Budget solide. Arrive en mars.' },
            expect.anything(),
        );

        patch.mockReset();
        answer();
        await user.type(field, ' Urgent.');
        await user.keyboard('{Meta>}{Enter}{/Meta}');
        expect(patch).toHaveBeenCalledTimes(1);

        // « Annuler » remet le texte enregistré.
        await user.click(screen.getByRole('button', { name: 'Annuler' }));
        expect(field).toHaveValue('Budget solide.');
    });
});
