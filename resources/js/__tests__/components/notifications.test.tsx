import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Notifications } from '@/components/notifications';

function visible(): HTMLElement {
    const option = document.querySelector<HTMLElement>(
        '[data-uidotsh-option]:not([hidden])',
    );

    if (!option) {
        throw new Error('Aucune variante visible');
    }

    return option;
}

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

    // Pendant la comparaison de variantes (picker ui.sh), le panneau est ouvert par défaut.
    it('counts unread notifications and lists them with their author', async () => {
        render(
            <Notifications
                items={[
                    {
                        id: 1,
                        actor: { name: 'Admin 2' },
                        title: 'a expédié la commande #1042',
                        at: 'il y a 2 min',
                    },
                    {
                        id: 2,
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

        await screen.findByText('1 non lue(s)', {
            selector: ':not([hidden] *)',
        });

        const panel = within(visible());
        expect(panel.getByText('Admin 2')).toBeInTheDocument();
        expect(
            panel.getByText('a expédié la commande #1042'),
        ).toBeInTheDocument();
        expect(panel.getByText('Claire Dubois')).toBeInTheDocument();
    });

    it('exposes exactly one visible variant to the picker', async () => {
        render(
            <Notifications
                items={[
                    {
                        id: 1,
                        actor: { name: 'Admin' },
                        title: 'a fait',
                        at: 'now',
                    },
                ]}
            />,
        );

        await screen.findByText('Notifications', {
            selector: ':not([hidden] *)',
        });

        expect(
            document.querySelectorAll('[data-uidotsh-option]:not([hidden])'),
        ).toHaveLength(1);
        expect(document.querySelectorAll('[data-uidotsh-option]')).toHaveLength(
            15,
        );
    });
});
