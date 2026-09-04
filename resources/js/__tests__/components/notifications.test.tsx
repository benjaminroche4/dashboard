import { render, screen, within } from '@testing-library/react';
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
        expect(
            screen.queryByRole('button', { name: /Tout marquer comme lu/ }),
        ).toBeNull();
    });

    it('lists notifications with author, coloured kind icon and read state', async () => {
        const user = userEvent.setup();
        render(
            <Notifications
                items={[
                    {
                        id: 1,
                        kind: 'order',
                        actor: { name: 'Admin 2' },
                        title: 'a expédié la commande #1042',
                        at: 'il y a 2 min',
                    },
                    {
                        id: 2,
                        kind: 'staff',
                        actor: { name: 'Claire Dubois' },
                        title: 'a rejoint le staff',
                        at: 'hier',
                        read: true,
                    },
                ]}
            />,
        );

        const trigger = screen.getByRole('button', {
            name: '1 notification(s) non lue(s)',
        });
        expect(trigger).toHaveTextContent('1');

        await user.click(trigger);

        const list = await screen.findByRole('list');
        const rows = within(list).getAllByRole('listitem');

        expect(rows).toHaveLength(2);
        expect(rows[0]).toHaveTextContent(
            'Admin 2 a expédié la commande #1042',
        );
        expect(rows[0].querySelector('span')).toHaveClass('bg-sky-100');
        expect(
            within(rows[0]).getByRole('img', { name: 'Non lue' }),
        ).toBeInTheDocument();
        expect(rows[1].querySelector('span')).toHaveClass('bg-emerald-100');
        expect(
            within(rows[1]).getByRole('img', { name: 'Lue' }),
        ).toBeInTheDocument();

        expect(screen.getByText('1 non lue(s)')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /Tout marquer comme lu/ }),
        ).toBeEnabled();
    });

    it('disables the mark-all action when everything is read', async () => {
        const user = userEvent.setup();
        render(
            <Notifications
                items={[
                    {
                        id: 1,
                        actor: { name: 'Système' },
                        title: 'a terminé la sauvegarde',
                        at: 'lundi',
                        read: true,
                    },
                ]}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'Notifications' }));

        expect(
            await screen.findByRole('button', {
                name: /Tout marquer comme lu/,
            }),
        ).toBeDisabled();
    });
});
