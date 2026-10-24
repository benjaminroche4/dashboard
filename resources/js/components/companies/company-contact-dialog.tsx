import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import InputError from '@/components/input-error';
import { PhoneInput } from '@/components/phone-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Spinner } from '@/components/ui/spinner';
import { contactFunctions } from '@/lib/contact-functions';
import { capitalizeName } from '@/lib/format';
import { store, update } from '@/routes/companies/contacts';
import type { CompanyContact, CompanyContactForm } from '@/types';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    companyUuid: string;
    /** Contact à modifier ; absent pour un ajout. */
    contact?: CompanyContact | null;
};

function initial(
    contact: CompanyContact | null | undefined,
): CompanyContactForm {
    return {
        first_name: contact?.first_name ?? '',
        last_name: contact?.last_name ?? '',
        position: contact?.position_value ?? '',
        is_primary: contact?.is_primary ?? false,
        email: contact?.email ?? '',
        phone: contact?.phone ?? '',
    };
}

/** Valeur du choix « Sans fonction » (Radix refuse une valeur vide). */
const NONE = '__none__';

/** Ajout ou modification d'un contact dans une entreprise. */
export function CompanyContactDialog({
    open,
    onOpenChange,
    companyUuid,
    contact = null,
}: Props) {
    const form = useForm<CompanyContactForm>(initial(contact));
    const editing = contact !== null;

    // Le dialogue est monté une fois : on recharge les champs à chaque ouverture.
    useEffect(() => {
        if (open) {
            form.setData(initial(contact));
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, contact]);

    const submit = () => {
        const options = {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        };

        if (contact) {
            form.patch(
                update({ company: companyUuid, contact: contact.id }).url,
                options,
            );
        } else {
            form.post(store({ company: companyUuid }).url, options);
        }
    };

    const field = (
        key: 'first_name' | 'last_name' | 'email',
        label: string,
        props: { type?: string; placeholder?: string; required?: boolean } = {},
    ) => (
        <div className="grid gap-2">
            <Label htmlFor={`company-contact-${key}`}>{label}</Label>
            <Input
                id={`company-contact-${key}`}
                value={form.data[key]}
                onChange={(event) => form.setData(key, event.target.value)}
                onBlur={
                    key === 'first_name' || key === 'last_name'
                        ? (event) =>
                              form.setData(
                                  key,
                                  capitalizeName(event.target.value),
                              )
                        : undefined
                }
                autoComplete="off"
                {...props}
            />
            <InputError message={form.errors[key]} />
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {editing
                            ? `Modifier ${contact.name}`
                            : 'Nouveau contact'}
                    </DialogTitle>
                    <DialogDescription>
                        Personne à joindre dans l’entreprise. Prénom et nom sont
                        obligatoires.
                    </DialogDescription>
                </DialogHeader>
                <form
                    className="grid gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit();
                    }}
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {field('first_name', 'Prénom', { required: true })}
                        {field('last_name', 'Nom', { required: true })}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="company-contact-position">
                            Fonction
                        </Label>
                        <Select
                            value={form.data.position || NONE}
                            onValueChange={(value) =>
                                form.setData(
                                    'position',
                                    value === NONE ? '' : value,
                                )
                            }
                        >
                            <SelectTrigger
                                id="company-contact-position"
                                className="w-full"
                            >
                                <SelectValue placeholder="Choisir une fonction" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NONE}>
                                    Sans fonction
                                </SelectItem>
                                {contactFunctions.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={form.errors.position} />
                    </div>
                    {/* Plusieurs contacts principaux possibles : une DRH a souvent
                        deux ou trois référents, la case n'en décoche aucun autre. */}
                    <label
                        htmlFor="company-contact-primary"
                        className="hover:bg-accent/40 flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors"
                    >
                        <Checkbox
                            id="company-contact-primary"
                            checked={form.data.is_primary}
                            onCheckedChange={(state) =>
                                form.setData('is_primary', state === true)
                            }
                            className="mt-0.5"
                        />
                        <span className="grid gap-0.5">
                            <span className="text-sm font-medium">
                                Contact principal
                            </span>
                            <span className="text-muted-foreground text-xs">
                                Référent que l’équipe joint d’abord. Une
                                entreprise peut en avoir plusieurs.
                            </span>
                        </span>
                    </label>
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="company-contact-phone">
                                Téléphone
                            </Label>
                            <PhoneInput
                                id="company-contact-phone"
                                value={form.data.phone}
                                onChange={(value) =>
                                    form.setData('phone', value)
                                }
                            />
                            <InputError message={form.errors.phone} />
                        </div>
                        {field('email', 'E-mail', {
                            type: 'email',
                            placeholder: 'prenom@entreprise.fr',
                        })}
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                        >
                            Annuler
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing && <Spinner />}
                            {editing ? 'Enregistrer' : 'Ajouter le contact'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
