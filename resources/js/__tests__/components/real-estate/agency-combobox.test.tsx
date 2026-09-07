import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AgencyCombobox } from '@/components/real-estate/agency-combobox';
import { agencyOptions } from '@/test/fixtures/real-estate';

describe('AgencyCombobox', () => {
    it('filters the agencies while typing and selects one', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <AgencyCombobox
                value=""
                onChange={onChange}
                agencies={agencyOptions}
            />,
        );

        const trigger = screen.getByRole('combobox', { name: 'Agence' });
        expect(trigger).toHaveTextContent('Indépendant (sans agence)');

        await user.click(trigger);
        await user.type(
            screen.getByPlaceholderText('Rechercher une agence…'),
            'ouest',
        );
        expect(
            screen.queryByRole('option', { name: /Agence du Marais/ }),
        ).not.toBeInTheDocument();
        await user.click(
            screen.getByRole('option', { name: /Bureau Paris Ouest/ }),
        );

        expect(onChange).toHaveBeenCalledWith('2');
    });

    it('shows the selected agency and clears it with « Indépendant »', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <AgencyCombobox
                value="1"
                onChange={onChange}
                agencies={agencyOptions}
            />,
        );

        const trigger = screen.getByRole('combobox', { name: 'Agence' });
        expect(trigger).toHaveTextContent('Agence du Marais');

        await user.click(trigger);
        await user.click(screen.getByRole('option', { name: /Indépendant/ }));
        expect(onChange).toHaveBeenCalledWith('');
    });
});
