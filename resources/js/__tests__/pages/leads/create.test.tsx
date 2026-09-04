import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, put, transform } = vi.hoisted(() => ({
    post: vi.fn(),
    put: vi.fn(),
    transform: vi.fn(),
}));

vi.mock('@inertiajs/react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@inertiajs/react')>();

    return {
        ...actual,
        Head: () => null,
        Link: ({
            href,
            children,
        }: {
            href: { url: string };
            children: ReactNode;
        }) => <a href={href.url}>{children}</a>,
        useForm: (initial: Record<string, unknown>) => useFormStub(initial),
    };
});

function useFormStub(initial: Record<string, unknown>) {
    const [data, setDataState] = useState(initial);

    return {
        data,
        errors: {},
        processing: false,
        setData: (key: string, value: unknown) =>
            setDataState((current) => ({ ...current, [key]: value })),
        transform,
        post,
        put,
    };
}

import LeadsCreate from '@/pages/leads/create';

const props = {
    offers: [
        {
            value: 'accompagne' as const,
            label: 'Accompagné',
            description: 'Offre Accompagné',
        },
        {
            value: 'confie' as const,
            label: 'Confié',
            description: 'Offre Confié',
        },
    ],
    sources: [
        { value: 'website' as const, label: 'Site web' },
        { value: 'referral' as const, label: 'Recommandation' },
    ],
    currencies: [
        { value: 'EUR' as const, label: 'Euro (EUR)' },
        { value: 'CHF' as const, label: 'Franc suisse (CHF)' },
    ],
    defaultCurrency: 'EUR' as const,
};

describe('Converting Machine page', () => {
    beforeEach(() => vi.clearAllMocks());

    it('renders the three sections and posts the lead with the budget in cents', async () => {
        const user = userEvent.setup();
        render(<LeadsCreate {...props} />);

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Converting Machine',
        );
        expect(
            screen.getByRole('heading', { name: 'Contact' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Projet' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Suivi' }),
        ).toBeInTheDocument();

        await user.type(screen.getByLabelText('Prénom'), 'Léa');
        await user.type(screen.getByLabelText('Nom'), 'Durand');
        await user.type(screen.getByLabelText('E-mail'), 'lea@example.com');
        await user.click(screen.getByRole('radio', { name: 'Confié' }));
        await user.type(screen.getByLabelText('Budget mensuel'), '2500');
        await user.click(screen.getByRole('radio', { name: '4 sur 5' }));
        expect(screen.getByText('4 / 5')).toBeInTheDocument();
        await user.click(
            screen.getByRole('button', { name: 'Ajouter le lead' }),
        );

        expect(post).toHaveBeenCalledWith('/leads');
        const transformer = transform.mock.calls.at(-1)?.[0] as (
            data: Record<string, unknown>,
        ) => Record<string, unknown>;
        const payload = transformer({
            offer: '',
            arrival_at: '',
            budget: '2500',
        });
        expect(payload.budget_cents).toBe(250_000);
        expect(payload.offer).toBeNull();
        expect(payload.arrival_at).toBeNull();
    });

    it('edits an existing lead and puts to the update route', async () => {
        const user = userEvent.setup();
        render(
            <LeadsCreate
                {...props}
                lead={{
                    id: 7,
                    name: 'Léa Durand',
                    first_name: 'Léa',
                    last_name: 'Durand',
                    email: 'lea@example.com',
                    phone: '',
                    offer: 'confie',
                    arrival_at: '2026-11-01',
                    budget: '2500',
                    currency: 'EUR',
                    origin_city: 'Genève',
                    source: 'referral',
                    message: '',
                    score: 4,
                }}
            />,
        );

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            'Modifier Léa Durand',
        );
        expect(screen.getByLabelText('Prénom')).toHaveValue('Léa');
        expect(screen.getByRole('radio', { name: 'Confié' })).toBeChecked();
        expect(screen.getByText('4 / 5')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Annuler' })).toHaveAttribute(
            'href',
            '/leads/7',
        );

        await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

        expect(put).toHaveBeenCalledWith('/leads/7');
        expect(post).not.toHaveBeenCalled();
    });
});
