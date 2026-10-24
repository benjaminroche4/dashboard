import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('@inertiajs/react', () => ({ router: { post } }));

import {
    CompanyFollowUpDialog,
    followUpRecipients,
} from '@/components/companies/company-follow-up-dialog';
import { makeCompany, makeCompanyContact } from '@/test/fixtures/company';

describe('followUpRecipients', () => {
    it('lists the primary contacts first and checked, the others, then the company address, without duplicates', () => {
        const company = makeCompany({ email: 'rh@zen.example' });
        const recipients = followUpRecipients(company, [
            makeCompanyContact({
                id: 2,
                name: 'Paul Martin',
                email: 'paul@zen.example',
                is_primary: false,
                position: null,
            }),
            makeCompanyContact({
                id: 1,
                name: 'Marie Durand',
                email: 'marie@zen.example',
                is_primary: true,
            }),
            makeCompanyContact({
                id: 3,
                name: 'Doublon',
                email: 'RH@zen.example',
                is_primary: false,
            }),
            makeCompanyContact({ id: 4, name: 'Sans adresse', email: null }),
        ]);

        expect(recipients.map((r) => [r.email, r.preselected])).toEqual([
            ['marie@zen.example', true],
            ['paul@zen.example', false],
            ['RH@zen.example', false],
        ]);
        expect(recipients[0]?.hint).toBe('Directeur · principal');
    });

    it('checks the company address when no contact is primary', () => {
        const recipients = followUpRecipients(
            { name: 'Zen', email: 'rh@zen.example' },
            [makeCompanyContact({ is_primary: false, email: 'a@zen.example' })],
        );

        expect(recipients.map((r) => [r.name, r.preselected])).toEqual([
            ['Marie Durand', false],
            ['Zen', true],
        ]);
    });
});

describe('CompanyFollowUpDialog', () => {
    beforeEach(() => post.mockClear());

    it('requires a recipient, a subject and a message, then posts one request with the three', async () => {
        const user = userEvent.setup();
        const company = makeCompany();
        render(
            <CompanyFollowUpDialog
                companyUuid={company.uuid}
                recipients={followUpRecipients(company, company.contacts)}
                open
                onOpenChange={() => undefined}
            />,
        );

        const dialog = screen.getByRole('dialog', {
            name: 'Envoyer un e-mail',
        });
        const send = within(dialog).getByRole('button', {
            name: /Envoyer \(1\)/,
        });
        // Le contact principal est coché d'office ; sans objet ni message, rien ne part.
        expect(
            within(dialog).getByRole('checkbox', { name: 'marie@zen.example' }),
        ).toBeChecked();
        expect(send).toBeDisabled();

        await user.type(
            within(dialog).getByLabelText('Objet'),
            'Point sur vos arrivées',
        );
        await user.type(
            within(dialog).getByLabelText('Message'),
            'Où en êtes-vous des trois arrivées prévues ?',
        );
        await user.click(
            within(dialog).getByRole('checkbox', { name: 'rh@zen.example' }),
        );
        expect(
            within(dialog).getByRole('button', { name: /Envoyer \(2\)/ }),
        ).toBeEnabled();

        await user.click(
            within(dialog).getByRole('button', { name: /Envoyer \(2\)/ }),
        );

        expect(post).toHaveBeenCalledWith(
            `/companies/${company.uuid}/follow-up`,
            {
                emails: ['marie@zen.example', 'rh@zen.example'],
                subject: 'Point sur vos arrivées',
                message: 'Où en êtes-vous des trois arrivées prévues ?',
            },
            expect.objectContaining({ preserveScroll: true }),
        );
    });
});
