import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { setData, post } = vi.hoisted(() => ({
    setData: vi.fn(),
    post: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            features: { addressAutocomplete: false, googleMapsKey: null },
        },
    }),
    useForm: (initial: Record<string, string>) => ({
        data: initial,
        errors: {},
        processing: false,
        setData,
        clearErrors: vi.fn(),
        post,
        patch: vi.fn(),
    }),
}));
vi.mock('@/hooks/use-contact-duplicates', () => ({
    useContactDuplicates: () => [],
}));

import { AgentDialog } from '@/components/real-estate/agent-dialog';
import { agencyOptions, makeAgent } from '@/test/fixtures/real-estate';

describe('AgentDialog', () => {
    it('offers the position as a closed list instead of a free text field', async () => {
        const user = userEvent.setup();
        render(
            <AgentDialog
                open
                onOpenChange={vi.fn()}
                agencies={agencyOptions}
            />,
        );

        const select = screen.getByRole('combobox', { name: 'Fonction' });
        expect(select).toHaveTextContent('Choisir une fonction');
        expect(screen.queryByRole('textbox', { name: 'Fonction' })).toBeNull();

        await user.click(select);
        const options = await screen.findAllByRole('option');
        expect(options.map((option) => option.textContent)).toEqual([
            'Négociateur',
            'Conseiller immobilier',
            'Directeur d’agence',
            'Gestionnaire locatif',
            'Property manager',
            'Assistant commercial',
            'Agent indépendant',
            'Autre',
        ]);
        await user.click(
            screen.getByRole('option', { name: 'Gestionnaire locatif' }),
        );

        expect(setData).toHaveBeenCalledWith('position', 'rental_manager');
    });

    it('preselects the stored position when editing', () => {
        render(
            <AgentDialog
                open
                onOpenChange={vi.fn()}
                agencies={agencyOptions}
                agent={makeAgent()}
            />,
        );

        expect(
            screen.getByRole('combobox', { name: 'Fonction' }),
        ).toHaveTextContent('Négociateur');
    });
});
