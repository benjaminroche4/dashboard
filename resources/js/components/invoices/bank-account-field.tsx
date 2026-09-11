import { Landmark } from 'lucide-react';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { BankAccountOption, Currency } from '@/types';

/** Valeur du sélecteur pour un compte saisi à la main. */
export const OTHER = '__other__';

/**
 * Comptes utilisables pour une devise : ceux de cette devise, puis ceux qui
 * servent pour toutes (miroir de `BankAccounts::forCurrency()`).
 */
export function accountsFor(
    accounts: BankAccountOption[],
    currency: Currency,
): BankAccountOption[] {
    return [
        ...accounts.filter((account) => account.currency === currency),
        ...accounts.filter((account) => account.currency === null),
    ];
}

/** Compte sélectionné : son IBAN, `OTHER` si l'IBAN saisi n'est dans aucun. */
export function selectedAccount(
    accounts: BankAccountOption[],
    currency: Currency,
    iban: string,
): string {
    if (iban.trim() === '') {
        return accountsFor(accounts, currency)[0]?.iban ?? OTHER;
    }

    return accounts.some((account) => account.iban === iban) ? iban : OTHER;
}

/**
 * Compte d'encaissement du document. Une société encaisse sur plusieurs
 * comptes selon la devise et la destination : le compte se choisit dans la
 * liste, ou se saisit à la main.
 */
export function BankAccountField({
    accounts,
    currency,
    bankName,
    bankIban,
    errors,
    onChange,
}: {
    accounts: BankAccountOption[];
    currency: Currency;
    bankName: string;
    bankIban: string;
    errors: { bank_name?: string; bank_iban?: string };
    onChange: (values: { bank_name: string; bank_iban: string }) => void;
}) {
    const usable = accountsFor(accounts, currency);
    const selected = selectedAccount(accounts, currency, bankIban);
    const custom = selected === OTHER;

    return (
        <div className="grid gap-2">
            <Label htmlFor="invoice-bank-account">Compte d’encaissement</Label>
            <Select
                value={selected}
                onValueChange={(value) => {
                    if (value === OTHER) {
                        onChange({ bank_name: bankName, bank_iban: ' ' });

                        return;
                    }

                    const account = accounts.find(
                        (candidate) => candidate.iban === value,
                    );
                    onChange({
                        bank_name: account?.bank ?? '',
                        bank_iban: account?.iban ?? '',
                    });
                }}
            >
                <SelectTrigger id="invoice-bank-account" className="w-full">
                    <Landmark aria-hidden className="size-4 opacity-60" />
                    <SelectValue placeholder="Compte par défaut" />
                </SelectTrigger>
                <SelectContent>
                    {usable.map((account) => (
                        <SelectItem key={account.iban} value={account.iban}>
                            {account.label}
                            <span className="text-muted-foreground">
                                {' '}
                                · {account.iban}
                            </span>
                        </SelectItem>
                    ))}
                    <SelectItem value={OTHER}>Un autre compte…</SelectItem>
                </SelectContent>
            </Select>
            {custom && (
                <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="invoice-bank-name">Banque</Label>
                        <Input
                            id="invoice-bank-name"
                            value={bankName}
                            onChange={(event) =>
                                onChange({
                                    bank_name: event.target.value,
                                    bank_iban: bankIban,
                                })
                            }
                            placeholder="Nom de la banque"
                            autoComplete="off"
                        />
                        <InputError message={errors.bank_name} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="invoice-bank-iban">IBAN</Label>
                        <Input
                            id="invoice-bank-iban"
                            value={bankIban.trim()}
                            onChange={(event) =>
                                onChange({
                                    bank_name: bankName,
                                    bank_iban: event.target.value,
                                })
                            }
                            placeholder="FR76 0000 0000 0000 0000 0000 000"
                            autoComplete="off"
                        />
                        <InputError message={errors.bank_iban} />
                    </div>
                </div>
            )}
        </div>
    );
}
