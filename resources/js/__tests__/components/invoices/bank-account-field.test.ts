import { describe, expect, it } from 'vitest';
import {
    accountsFor,
    OTHER,
    selectedAccount,
} from '@/components/invoices/bank-account-field';
import type { BankAccountOption } from '@/types';

const accounts: BankAccountOption[] = [
    { label: 'Compte suisse', bank: 'BCGE', iban: 'CH11', currency: 'CHF' },
    { label: 'Compte français', bank: 'Qonto', iban: 'FR22', currency: 'EUR' },
    { label: 'Compte pivot', bank: 'Wise', iban: 'BE33', currency: null },
];

describe('accountsFor', () => {
    it('puts the accounts of the currency first, then the neutral ones', () => {
        expect(accountsFor(accounts, 'EUR').map((a) => a.iban)).toEqual([
            'FR22',
            'BE33',
        ]);
        expect(accountsFor(accounts, 'CHF').map((a) => a.iban)).toEqual([
            'CH11',
            'BE33',
        ]);
    });
});

describe('selectedAccount', () => {
    it('defaults to the first account usable for the currency', () => {
        expect(selectedAccount(accounts, 'EUR', '')).toBe('FR22');
        expect(selectedAccount(accounts, 'CHF', '')).toBe('CH11');
    });

    it('keeps a known account, and switches to « other » for a hand-typed one', () => {
        expect(selectedAccount(accounts, 'EUR', 'BE33')).toBe('BE33');
        expect(selectedAccount(accounts, 'EUR', 'LT44')).toBe(OTHER);
    });
});
