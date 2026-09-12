import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
    accountsFor,
    BankAccountField,
    optionsWithCustom,
} from '@/components/invoices/bank-account-field';
import type { BankAccountOption } from '@/types';

const accounts: BankAccountOption[] = [
    {
        label: 'Compte suisse',
        bank: 'BCGE',
        iban: 'CH11',
        reference: '',
        currency: 'CHF',
    },
    {
        label: 'Compte français',
        bank: 'Qonto',
        iban: 'FR22',
        reference: 'RIP-FR',
        currency: 'EUR',
    },
    {
        label: 'Compte pivot',
        bank: 'Wise',
        iban: 'BE33',
        reference: 'RIP-PIVOT',
        currency: null,
    },
];

describe('accountsFor', () => {
    it('puts the accounts of the currency first, then the neutral ones', () => {
        expect(accountsFor(accounts, 'EUR').map((a) => a.iban)).toEqual([
            'FR22',
            'BE33',
        ]);
    });

    it('drops an account without an IBAN, which Radix would refuse as an option', () => {
        const broken = [
            {
                label: 'Vide',
                bank: '',
                iban: '',
                reference: '',
                currency: null,
            },
            ...accounts,
        ];

        expect(accountsFor(broken, 'EUR').map((a) => a.iban)).toEqual([
            'FR22',
            'BE33',
        ]);
    });
});

describe('optionsWithCustom', () => {
    it('adds the account typed on the document when it is not a known one', () => {
        const options = optionsWithCustom(accounts, 'EUR', 'Revolut', 'LT44');

        expect(options.map((a) => a.iban)).toEqual(['FR22', 'BE33', 'LT44']);
        expect(options[2]?.label).toBe('Revolut');
    });

    it('never repeats a known account, and ignores an empty IBAN', () => {
        expect(optionsWithCustom(accounts, 'EUR', '', 'FR22')).toHaveLength(2);
        expect(optionsWithCustom(accounts, 'EUR', '', '  ')).toHaveLength(2);
    });
});

describe('BankAccountField', () => {
    const render_ = (
        props: Partial<Parameters<typeof BankAccountField>[0]>,
    ) => {
        const onChange = vi.fn();
        render(
            <BankAccountField
                accounts={accounts}
                currency="EUR"
                bankName=""
                bankIban=""
                bankReference=""
                errors={{}}
                onChange={onChange}
                {...props}
            />,
        );

        return onChange;
    };

    it('adds an account from the dialog, without leaving the form', async () => {
        const user = userEvent.setup();
        const onChange = render_({});

        await user.click(
            screen.getByRole('button', { name: 'Ajouter un compte' }),
        );
        await user.type(screen.getByLabelText('Banque'), 'Revolut');
        await user.type(screen.getByLabelText('IBAN'), 'LT44 1234');
        await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

        expect(onChange).toHaveBeenCalledWith({
            bank_name: 'Revolut',
            bank_iban: 'LT44 1234',
            bank_reference: '',
        });
    });

    it('records the reference to quote on the transfer', async () => {
        const user = userEvent.setup();
        const onChange = render_({});

        await user.click(
            screen.getByRole('button', { name: 'Ajouter un compte' }),
        );
        await user.type(screen.getByLabelText('IBAN'), 'LT44 1234');
        await user.type(screen.getByLabelText('Référence'), 'RIP-2026-04');
        await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

        expect(onChange).toHaveBeenCalledWith({
            bank_name: '',
            bank_iban: 'LT44 1234',
            bank_reference: 'RIP-2026-04',
        });
    });

    it('carries the reference of the account picked in the list', async () => {
        const user = userEvent.setup();
        const onChange = render_({ currency: 'CHF' });

        await user.click(screen.getByRole('combobox'));
        await user.click(screen.getByRole('option', { name: /Compte pivot/ }));

        expect(onChange).toHaveBeenCalledWith({
            bank_name: 'Wise',
            bank_iban: 'BE33',
            bank_reference: 'RIP-PIVOT',
        });
    });

    it('shows the reference already set on the document', () => {
        render_({
            bankName: 'Revolut',
            bankIban: 'LT44',
            bankReference: 'RIP-2026-04',
        });

        expect(
            screen.getByText('Référence à indiquer : RIP-2026-04'),
        ).toBeInTheDocument();
    });

    it('refuses an empty IBAN instead of recording a blank account', async () => {
        const user = userEvent.setup();
        const onChange = render_({});

        await user.click(
            screen.getByRole('button', { name: 'Ajouter un compte' }),
        );
        await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

        expect(screen.getByText('Saisissez un IBAN.')).toBeInTheDocument();
        expect(onChange).not.toHaveBeenCalled();
    });

    it('offers to correct the account already typed on the document', async () => {
        const user = userEvent.setup();
        render_({ bankName: 'Revolut', bankIban: 'LT44' });

        await user.click(screen.getByRole('button', { name: 'Modifier' }));

        expect(screen.getByLabelText('IBAN')).toHaveValue('LT44');
        expect(
            screen.getByRole('heading', { name: 'Modifier le compte' }),
        ).toBeInTheDocument();
    });

    it('still offers to add one when the company has no account at all', () => {
        render_({ accounts: [] });

        expect(screen.queryByRole('combobox')).toBeNull();
        expect(
            screen.getByRole('button', { name: 'Ajouter un compte' }),
        ).toBeInTheDocument();
    });
});
