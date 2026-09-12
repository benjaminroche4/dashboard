import { Landmark, Pencil, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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

/** Coordonnées d'encaissement figées sur un document. */
export type BankAccountValues = {
    bank_name: string;
    bank_iban: string;
    bank_reference: string;
};

/**
 * Comptes proposés pour une devise : ceux de cette devise, puis ceux qui
 * servent pour toutes (miroir de `BankAccounts::forCurrency()`). Un compte
 * sans IBAN n'en est pas un : il est écarté.
 */
export function accountsFor(
    accounts: BankAccountOption[],
    currency: Currency,
): BankAccountOption[] {
    const usable = accounts.filter((account) => account.iban.trim() !== '');

    return [
        ...usable.filter((account) => account.currency === currency),
        ...usable.filter((account) => account.currency === null),
    ];
}

/**
 * Liste du sélecteur : les comptes connus, plus celui saisi à la main sur ce
 * document quand il n'en fait pas partie.
 */
export function optionsWithCustom(
    accounts: BankAccountOption[],
    currency: Currency,
    bankName: string,
    bankIban: string,
): BankAccountOption[] {
    const usable = accountsFor(accounts, currency);
    const iban = bankIban.trim();

    if (iban === '' || usable.some((account) => account.iban === iban)) {
        return usable;
    }

    return [
        ...usable,
        {
            label: bankName.trim() || 'Compte saisi',
            bank: bankName.trim(),
            iban,
            reference: '',
            currency: null,
        },
    ];
}

/** Modale d'ajout ou de correction d'un compte d'encaissement. */
export function BankAccountDialog({
    open,
    onOpenChange,
    bankName,
    bankIban,
    bankReference,
    onSave,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    bankName: string;
    bankIban: string;
    bankReference: string;
    onSave: (values: BankAccountValues) => void;
}) {
    const [name, setName] = useState(bankName);
    const [iban, setIban] = useState(bankIban);
    const [reference, setReference] = useState(bankReference);
    const [error, setError] = useState<string | undefined>();

    // La modale est montée une fois : on repart des valeurs à chaque ouverture.
    useEffect(() => {
        if (open) {
            setName(bankName);
            setIban(bankIban);
            setReference(bankReference);
            setError(undefined);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const save = () => {
        if (iban.trim() === '') {
            setError('Saisissez un IBAN.');

            return;
        }

        onSave({
            bank_name: name.trim(),
            bank_iban: iban.trim(),
            bank_reference: reference.trim(),
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {bankIban.trim() === ''
                            ? 'Ajouter un compte'
                            : 'Modifier le compte'}
                    </DialogTitle>
                    <DialogDescription>
                        Ces coordonnées sont figées sur ce document : elles ne
                        changent pas les autres.
                    </DialogDescription>
                </DialogHeader>
                <form
                    className="grid gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        save();
                    }}
                >
                    <div className="grid gap-2">
                        <Label htmlFor="bank-account-name">Banque</Label>
                        <Input
                            id="bank-account-name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="Nom de la banque"
                            autoComplete="off"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="bank-account-iban">IBAN</Label>
                        <Input
                            id="bank-account-iban"
                            value={iban}
                            onChange={(event) => setIban(event.target.value)}
                            placeholder="FR76 0000 0000 0000 0000 0000 000"
                            autoComplete="off"
                            autoFocus
                        />
                        <InputError message={error} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="bank-account-reference">
                            Référence
                        </Label>
                        <Input
                            id="bank-account-reference"
                            value={reference}
                            onChange={(event) =>
                                setReference(event.target.value)
                            }
                            placeholder="Communication du virement"
                            autoComplete="off"
                        />
                        <p className="text-muted-foreground text-xs">
                            Facultative : elle est rappelée sur le document pour
                            que la banque rapproche le paiement.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                        >
                            Annuler
                        </Button>
                        <Button type="submit">Enregistrer</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Compte d'encaissement du document : choisi dans la liste des comptes de la
 * société, ou saisi à la main dans une modale. Une société encaisse sur
 * plusieurs comptes selon la devise et la destination.
 */
export function BankAccountField({
    accounts,
    currency,
    bankName,
    bankIban,
    bankReference,
    errors,
    onChange,
}: {
    accounts: BankAccountOption[];
    currency: Currency;
    bankName: string;
    bankIban: string;
    bankReference: string;
    errors: {
        bank_name?: string;
        bank_iban?: string;
        bank_reference?: string;
    };
    onChange: (values: BankAccountValues) => void;
}) {
    const [editing, setEditing] = useState(false);
    const options = optionsWithCustom(accounts, currency, bankName, bankIban);
    const known = accountsFor(accounts, currency);
    const selected = bankIban.trim() || options[0]?.iban || '';
    // Le compte du document ne vient pas de la configuration : il se modifie.
    const custom =
        selected !== '' && !known.some((account) => account.iban === selected);

    return (
        <div className="grid gap-2">
            <Label htmlFor="invoice-bank-account">Compte d’encaissement</Label>
            <div className="flex items-center gap-2">
                {options.length > 0 && (
                    <Select
                        value={selected}
                        onValueChange={(value) => {
                            const account = options.find(
                                (candidate) => candidate.iban === value,
                            );

                            onChange({
                                bank_name: account?.bank ?? '',
                                bank_iban: account?.iban ?? '',
                                bank_reference: account?.reference ?? '',
                            });
                        }}
                    >
                        <SelectTrigger
                            id="invoice-bank-account"
                            className="w-full"
                        >
                            <Landmark
                                aria-hidden
                                className="size-4 opacity-60"
                            />
                            <SelectValue placeholder="Compte par défaut" />
                        </SelectTrigger>
                        <SelectContent>
                            {options.map((account) => (
                                <SelectItem
                                    key={account.iban}
                                    value={account.iban}
                                >
                                    {account.label}
                                    <span className="text-muted-foreground">
                                        {' '}
                                        · {account.iban}
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setEditing(true)}
                >
                    {custom ? (
                        <>
                            <Pencil aria-hidden />
                            Modifier
                        </>
                    ) : (
                        <>
                            <Plus aria-hidden />
                            Ajouter un compte
                        </>
                    )}
                </Button>
            </div>
            {bankReference.trim() !== '' && (
                <p className="text-muted-foreground text-xs">
                    Référence à indiquer : {bankReference.trim()}
                </p>
            )}
            <InputError
                message={
                    errors.bank_iban ??
                    errors.bank_name ??
                    errors.bank_reference
                }
            />
            <BankAccountDialog
                open={editing}
                onOpenChange={setEditing}
                bankName={custom ? bankName : ''}
                bankIban={custom ? bankIban : ''}
                bankReference={custom ? bankReference : ''}
                onSave={onChange}
            />
        </div>
    );
}
