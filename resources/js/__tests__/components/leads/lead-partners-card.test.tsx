import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, del } = vi.hoisted(() => ({ post: vi.fn(), del: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    router: { delete: del },
    useForm: (initial: Record<string, string>) => useFormStub(initial),
    Link: ({
        href,
        children,
        ...props
    }: {
        href: { url: string };
        children: ReactNode;
    }) => (
        <a href={href.url} {...props}>
            {children}
        </a>
    ),
}));

function useFormStub(initial: Record<string, string>) {
    const [data, setDataState] = useState(initial);

    return {
        data,
        errors: {} as Record<string, string | undefined>,
        processing: false,
        setData: (key: string | Record<string, string>, value?: string) =>
            setDataState((current) =>
                typeof key === 'string'
                    ? { ...current, [key]: value ?? '' }
                    : { ...current, ...key },
            ),
        clearErrors: () => undefined,
        post,
    };
}

import {
    groupPartners,
    LeadPartnersCard,
} from '@/components/leads/lead-partners-card';
import { makeLeadDetail } from '@/test/fixtures/lead';
import { partnerRoles } from '@/test/fixtures/partner';
import type { LeadPartnerLink, PartnerOption } from '@/types';

const options: PartnerOption[] = [
    {
        id: 1,
        name: 'Zen Assurances',
        type: 'insurance',
        type_label: 'Assurance',
    },
    { id: 2, name: 'Alpha Gestion', type: 'management', type_label: 'Gestion' },
];

const link: LeadPartnerLink = {
    id: 9,
    role: 'home_insurance',
    role_label: 'Assurance habitation',
    note: 'Devis demandé',
    partner: {
        id: 1,
        uuid: '0199a9a0-0000-7000-8000-0000000000c1',
        name: 'Zen Assurances',
        type: 'insurance',
        type_label: 'Assurance',
        email: 'contact@zen.example',
        phone: null,
        contacts: [{ id: 3, name: 'Marie Durand', email: 'marie@zen.example' }],
    },
};

describe('groupPartners', () => {
    it('groups by type label alphabetically', () => {
        expect(groupPartners(options).map((group) => group.label)).toEqual([
            'Assurance',
            'Gestion',
        ]);
    });
});

describe('LeadPartnersCard', () => {
    beforeEach(() => {
        post.mockReset();
        del.mockReset();
    });

    it('lists the partners with role and note, forwards the dossier and removes one', async () => {
        const user = userEvent.setup();
        const lead = makeLeadDetail();
        render(
            <LeadPartnersCard
                lead={lead}
                links={[link]}
                partners={options}
                roles={partnerRoles}
            />,
        );

        const card = within(
            screen.getByRole('region', { name: 'Partenaires du dossier' }),
        );
        expect(
            card.getByRole('link', { name: 'Zen Assurances' }),
        ).toHaveAttribute(
            'href',
            '/partners/0199a9a0-0000-7000-8000-0000000000c1',
        );
        expect(card.getByText('Assurance habitation')).toBeInTheDocument();
        expect(card.getByText('Devis demandé')).toBeInTheDocument();

        await user.click(
            card.getByRole('button', { name: 'Transmettre le dossier' }),
        );
        const dialog = screen.getByRole('dialog', {
            name: 'Transmettre le dossier à Zen Assurances',
        });
        // Le premier destinataire (l'adresse du partenaire) est présélectionné.
        expect(
            within(dialog).getByRole('combobox', { name: 'Destinataire' }),
        ).toHaveTextContent('contact@zen.example');
        await user.type(
            within(dialog).getByLabelText('Mot d’accompagnement'),
            'Merci.',
        );
        await user.click(
            within(dialog).getByRole('button', { name: 'Transmettre' }),
        );
        expect(post).toHaveBeenCalledWith(
            `/locataires/${lead.uuid}/partners/9/forward`,
            expect.objectContaining({ preserveScroll: true }),
        );
        await user.click(
            within(dialog).getByRole('button', { name: 'Annuler' }),
        );

        await user.click(
            card.getByRole('button', { name: 'Retirer Zen Assurances' }),
        );
        expect(del).toHaveBeenCalledWith(
            `/locataires/${lead.uuid}/partners/9`,
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('adds a partner with a role', async () => {
        const user = userEvent.setup();
        const lead = makeLeadDetail();
        render(
            <LeadPartnersCard
                lead={lead}
                links={[]}
                partners={options}
                roles={partnerRoles}
            />,
        );

        expect(
            screen.getByText('Aucun partenaire n’intervient sur ce dossier.'),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Ajouter' }));
        const dialog = screen.getByRole('dialog', {
            name: 'Ajouter un partenaire au dossier',
        });
        const submit = within(dialog).getByRole('button', { name: 'Ajouter' });
        expect(submit).toBeDisabled();

        await user.click(
            within(dialog).getByRole('combobox', { name: 'Partenaire' }),
        );
        await user.click(screen.getByRole('option', { name: 'Alpha Gestion' }));
        await user.click(
            within(dialog).getByRole('combobox', { name: 'Rôle' }),
        );
        await user.click(
            screen.getByRole('option', { name: 'Gestion locative' }),
        );
        expect(submit).toBeEnabled();
        await user.click(submit);
        expect(post).toHaveBeenCalledWith(
            `/locataires/${lead.uuid}/partners`,
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('explains when the directory is empty', () => {
        render(
            <LeadPartnersCard
                lead={makeLeadDetail()}
                links={[]}
                partners={[]}
                roles={partnerRoles}
            />,
        );

        expect(
            screen.getByText(
                'Aucun partenaire dans l’annuaire pour le moment.',
            ),
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Ajouter' })).toBeDisabled();
    });
});
