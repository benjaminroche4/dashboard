import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { patch, post } = vi.hoisted(() => ({ patch: vi.fn(), post: vi.fn() }));

vi.mock('@/hooks/use-contact-duplicates', () => ({
    useContactDuplicates: () => [],
}));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { delete: vi.fn(), post },
    usePage: () => ({
        props: {
            auth: { user: { role: 'admin' } },
            features: { addressAutocomplete: false, googleMapsKey: null },
        },
    }),
    useForm: (initial: Record<string, unknown>) => useFormStub(initial),
    Link: ({
        href,
        children,
        ...props
    }: {
        href: { url: string } | string;
        children: ReactNode;
    }) => (
        <a href={typeof href === 'string' ? href : href.url} {...props}>
            {children}
        </a>
    ),
}));

function useFormStub(initial: Record<string, unknown>) {
    const [data, setDataState] = useState(initial);

    return {
        data,
        errors: {} as Record<string, string | undefined>,
        processing: false,
        setData: (key: string | Record<string, unknown>, value?: unknown) =>
            setDataState((current) =>
                typeof key === 'string'
                    ? { ...current, [key]: value }
                    : { ...current, ...key },
            ),
        clearErrors: () => undefined,
        transform: () => undefined,
        post: vi.fn(),
        patch,
    };
}

import OwnerShow from '@/pages/owners/show';
import { makeOwner, ownerStatuses } from '@/test/fixtures/owner';
import { makeProperty } from '@/test/fixtures/property';

describe('Owner detail page', () => {
    it('shows contact, lead, properties and opens the edit dialog', async () => {
        const user = userEvent.setup();
        render(
            <OwnerShow
                owner={makeOwner({
                    company: 'SCI Rivoli',
                    notes: 'Préfère être appelée le matin.',
                    lead: {
                        uuid: 'lead-1',
                        reference: 'LD-0042',
                        status_label: 'En cours',
                    },
                })}
                properties={[makeProperty()]}
                statuses={ownerStatuses}
            />,
        );

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Zoé Martin',
        );
        expect(screen.getByText('SCI Rivoli')).toBeInTheDocument();
        const contact = within(screen.getByRole('region', { name: 'Contact' }));
        expect(
            contact.getByRole('link', { name: 'zoe@example.com' }),
        ).toHaveAttribute('href', 'mailto:zoe@example.com');
        expect(
            contact.getByText('8 rue de Rivoli, 75004 Paris'),
        ).toBeInTheDocument();
        expect(contact.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
            'href',
            'https://wa.me/33612345678',
        );
        expect(
            screen.getByText('Préfère être appelée le matin.'),
        ).toBeInTheDocument();

        const lead = within(screen.getByRole('region', { name: 'Lead' }));
        expect(
            lead.getByRole('link', { name: 'Lead LD-0042' }),
        ).toHaveAttribute('href', '/locataires/lead-1');

        const properties = within(
            screen.getByRole('region', { name: 'Biens' }),
        );
        expect(
            properties.getByRole('link', { name: 'T2 lumineux · 11e' }),
        ).toHaveAttribute(
            'href',
            '/properties/0199a9a0-0000-7000-8000-0000000000f1',
        );
        expect(properties.getByText(/1 500,00 € \/ mois/)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Modifier' }));
        const dialog = within(
            await screen.findByRole('dialog', { name: 'Modifier Zoé Martin' }),
        );
        expect(dialog.getByLabelText('E-mail')).toHaveValue('zoe@example.com');
    });

    it('offers to create the lead when the owner has none', async () => {
        const user = userEvent.setup();
        render(
            <OwnerShow
                owner={makeOwner({ lead: null })}
                properties={[]}
                statuses={ownerStatuses}
            />,
        );

        expect(
            screen.getByText(/Aucun bien de l’annuaire/),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Créer le lead' }));
        expect(post).toHaveBeenCalledWith(
            '/owners/0199a9a0-0000-7000-8000-0000000000d1/convert',
            {},
            expect.anything(),
        );
    });
});
