import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Notifications } from '@/components/notifications';

describe('Notifications', () => {
    it('shows an empty state when there is nothing to read', async () => {
        const user = userEvent.setup();
        render(<Notifications />);

        const trigger = screen.getByRole('button', { name: 'Notifications' });
        expect(trigger.querySelector('span')).toBeNull();

        await user.click(trigger);

        expect(
            await screen.findByText('Aucune notification pour le moment.'),
        ).toBeInTheDocument();
    });

    it('counts unread notifications and lists them', async () => {
        const user = userEvent.setup();
        render(
            <Notifications
                items={[
                    { id: 1, title: 'Commande expédiée', at: 'il y a 2 min' },
                    { id: 2, title: 'Nouveau membre', at: 'hier', read: true },
                ]}
            />,
        );

        const trigger = screen.getByRole('button', {
            name: '1 notification(s) non lue(s)',
        });
        expect(trigger).toHaveTextContent('1');

        await user.click(trigger);

        expect(
            await screen.findByText('Commande expédiée'),
        ).toBeInTheDocument();
        expect(screen.getByText('Nouveau membre')).toBeInTheDocument();
        expect(screen.getByText('1 non lue(s)')).toBeInTheDocument();
    });
});
