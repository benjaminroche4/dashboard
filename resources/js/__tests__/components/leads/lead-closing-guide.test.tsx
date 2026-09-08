import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { LeadClosingGuide } from '@/components/leads/lead-closing-guide';
import { closingQuestionCount, questionCount } from '@/lib/closing-guide';
import { ownerClosingGuide } from '@/lib/owner-closing-guide';

describe('LeadClosingGuide', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    it('opens a side panel with the themed questions and their tips', async () => {
        const user = userEvent.setup();
        render(<LeadClosingGuide />);

        await user.click(
            screen.getByRole('button', { name: 'Guide de closing' }),
        );
        const panel = screen.getByRole('dialog', { name: 'Guide de closing' });

        expect(
            within(panel).getByText('Profil et situation du client'),
        ).toBeInTheDocument();
        expect(
            within(panel).getByText(/Le « non meublé total » est rare à Paris/),
        ).toBeInTheDocument();
        expect(within(panel).getByRole('progressbar')).toHaveAttribute(
            'aria-valuenow',
            '0',
        );
        expect(
            within(panel).getByText(
                `0 sur ${closingQuestionCount} questions posées`,
            ),
        ).toBeInTheDocument();
    });

    it('ticks asked questions, counts them per theme and remembers them per lead', async () => {
        const user = userEvent.setup();
        const { unmount } = render(<LeadClosingGuide storageKey="42" />);

        await user.click(
            screen.getByRole('button', { name: 'Guide de closing' }),
        );
        const panel = screen.getByRole('dialog', { name: 'Guide de closing' });
        const motivations = within(panel).getByRole('checkbox', {
            name: 'Motivations',
        });
        expect(motivations).toHaveAttribute('aria-checked', 'false');

        await user.click(motivations);

        expect(motivations).toHaveAttribute('aria-checked', 'true');
        expect(within(panel).getByRole('progressbar')).toHaveAttribute(
            'aria-valuenow',
            '1',
        );
        expect(
            within(panel).getByRole('region', {
                name: 'Profil et situation du client',
            }),
        ).toHaveTextContent('1/3');
        expect(
            screen.getByRole('button', { name: /Guide de closing/ }),
        ).toHaveTextContent(`1/${closingQuestionCount}`);

        unmount();
        render(<LeadClosingGuide storageKey="42" />);
        expect(
            screen.getByRole('button', { name: /Guide de closing/ }),
        ).toHaveTextContent(`1/${closingQuestionCount}`);
    });

    it('switches the questions between French and English', async () => {
        const user = userEvent.setup();
        render(<LeadClosingGuide />);

        await user.click(
            screen.getByRole('button', { name: 'Guide de closing' }),
        );
        const panel = screen.getByRole('dialog', { name: 'Guide de closing' });
        const languages = within(panel).getByLabelText('Langue des questions', {
            selector: '[role]',
        });

        expect(
            within(languages).getByRole('radio', { name: 'Français' }),
        ).toHaveAttribute('aria-checked', 'true');
        expect(
            within(panel).getByText(/Où habitez-vous aujourd’hui/),
        ).toBeInTheDocument();

        await user.click(
            within(languages).getByRole('radio', { name: 'Anglais' }),
        );

        expect(
            within(panel).getByText(/Where do you live today/),
        ).toBeInTheDocument();
        expect(
            within(panel).queryByText(/Où habitez-vous aujourd’hui/),
        ).not.toBeInTheDocument();
        expect(
            within(panel).getByRole('checkbox', { name: 'Motivations' }),
        ).toBeInTheDocument();
    });

    it('follows the language of the lead', async () => {
        const user = userEvent.setup();
        const { rerender } = render(<LeadClosingGuide language="en" />);

        await user.click(
            screen.getByRole('button', { name: 'Guide de closing' }),
        );
        const panel = screen.getByRole('dialog', { name: 'Guide de closing' });
        expect(
            within(panel).getByText(/Where do you live today/),
        ).toBeInTheDocument();

        rerender(<LeadClosingGuide language="fr" />);
        expect(
            within(panel).getByText(/Où habitez-vous aujourd’hui/),
        ).toBeInTheDocument();
    });

    it('shows the owner questions when given the owner guide, with its own memory', async () => {
        const user = userEvent.setup();
        render(
            <LeadClosingGuide
                guide={ownerClosingGuide}
                storageKey="owner:new"
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Guide de closing' }),
        );
        const panel = screen.getByRole('dialog', { name: 'Guide de closing' });

        expect(within(panel).getByText('Le bien')).toBeInTheDocument();
        expect(within(panel).getByText('Mandat proposé')).toBeInTheDocument();
        expect(
            within(panel).queryByText('Profil et situation du client'),
        ).not.toBeInTheDocument();
        expect(
            within(panel).getByText(
                `0 sur ${questionCount(ownerClosingGuide)} questions posées`,
            ),
        ).toBeInTheDocument();

        await user.click(
            within(panel).getByRole('checkbox', { name: 'Description' }),
        );
        expect(sessionStorage.getItem('lead-closing-guide:owner:new')).toBe(
            '["description"]',
        );
    });

    it('marks a theme complete and resets the progress', async () => {
        const user = userEvent.setup();
        sessionStorage.setItem(
            'lead-closing-guide:new',
            JSON.stringify(['motivations', 'occupants', 'pets']),
        );
        render(<LeadClosingGuide />);

        await user.click(
            screen.getByRole('button', { name: /Guide de closing/ }),
        );
        const panel = screen.getByRole('dialog', { name: 'Guide de closing' });

        expect(
            within(panel).getByRole('region', {
                name: 'Profil et situation du client',
            }),
        ).toHaveTextContent('3/3');

        await user.click(
            within(panel).getByRole('button', { name: 'Réinitialiser' }),
        );
        expect(within(panel).getByRole('progressbar')).toHaveAttribute(
            'aria-valuenow',
            '0',
        );
        expect(sessionStorage.getItem('lead-closing-guide:new')).toBe('[]');
    });
});
