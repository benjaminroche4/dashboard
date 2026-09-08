import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, del, page } = vi.hoisted(() => ({
    post: vi.fn(),
    del: vi.fn(),
    page: { props: { features: { assistant: true } } },
}));
vi.mock('@inertiajs/react', () => ({
    router: { post, delete: del },
    usePage: () => page,
}));

import { LeadQualificationCard } from '@/components/leads/lead-qualification-card';
import { makeLeadDetail, makeQualification } from '@/test/fixtures/lead';

describe('LeadQualificationCard', () => {
    beforeEach(() => {
        post.mockReset();
        del.mockReset();
        page.props.features.assistant = true;
    });

    it('offers to qualify with the assistant when nothing is proposed yet', async () => {
        const user = userEvent.setup();
        render(
            <LeadQualificationCard
                lead={makeLeadDetail()}
                qualification={null}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Qualifier avec l’IA' }),
        );
        expect(post).toHaveBeenCalledWith(
            '/locataires/0199a9a0-0000-7000-8000-000000000001/qualify',
            {},
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('renders nothing without assistant nor proposal', () => {
        page.props.features.assistant = false;
        const { container } = render(
            <LeadQualificationCard
                lead={makeLeadDetail()}
                qualification={null}
            />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    it('shows the proposal with every field ticked and applies the kept ones', async () => {
        const user = userEvent.setup();
        render(
            <LeadQualificationCard
                lead={makeLeadDetail()}
                qualification={makeQualification()}
            />,
        );

        const card = within(screen.getByTestId('lead-qualification'));
        expect(
            card.getByLabelText('Proposé par l’assistant IA'),
        ).toBeInTheDocument();
        expect(card.getByText(/Cadre muté de Genève/)).toBeInTheDocument();
        expect(card.getByText('Note proposée : 4 / 5')).toBeInTheDocument();
        expect(card.getAllByRole('checkbox')).toHaveLength(3);
        expect(
            card.getByRole('button', { name: 'Appliquer 3 champ(s)' }),
        ).toBeInTheDocument();

        await user.click(
            card.getByRole('checkbox', { name: /Arrondissements/ }),
        );
        await user.click(
            card.getByRole('button', { name: 'Appliquer 2 champ(s)' }),
        );
        expect(post).toHaveBeenCalledWith(
            '/locataires/0199a9a0-0000-7000-8000-000000000001/qualification',
            { fields: ['company', 'score'] },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('dismisses the proposal', async () => {
        const user = userEvent.setup();
        render(
            <LeadQualificationCard
                lead={makeLeadDetail()}
                qualification={makeQualification()}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Ignorer' }));
        expect(del).toHaveBeenCalledWith(
            '/locataires/0199a9a0-0000-7000-8000-000000000001/qualification',
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('only adds the summary when every proposed field is already known', () => {
        render(
            <LeadQualificationCard
                lead={makeLeadDetail()}
                qualification={makeQualification({ fields: [] })}
            />,
        );

        expect(
            screen.getByRole('button', { name: 'Ajouter le résumé' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/Tous les champs lus sont déjà renseignés/),
        ).toBeInTheDocument();
    });
});
