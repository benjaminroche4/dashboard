import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import InputError from '@/components/input-error';
import { PhoneInput } from '@/components/phone-input';
import { AddressFields } from '@/components/real-estate/address-fields';
import { ContactDuplicatesAlert } from '@/components/real-estate/contact-duplicates-alert';
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
import { Textarea } from '@/components/ui/textarea';
import { useContactDuplicates } from '@/hooks/use-contact-duplicates';
import {
    duplicates as partnerDuplicates,
    store,
    update,
} from '@/routes/partners';
import type {
    Partner,
    PartnerForm,
    PartnerType,
    PartnerTypeOption,
} from '@/types';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    types: PartnerTypeOption[];
    /** Partenaire à modifier ; absent pour un ajout. */
    partner?: Partner | null;
    /** Type présélectionné pour un ajout (filtre actif de la liste). */
    defaultType?: PartnerType | '';
};

function initial(
    partner: Partner | null | undefined,
    defaultType: PartnerType | '',
): PartnerForm {
    return {
        name: partner?.name ?? '',
        type: partner?.type ?? defaultType,
        email: partner?.email ?? '',
        phone: partner?.phone ?? '',
        website: partner?.website ?? '',
        street: partner?.street ?? '',
        postal_code: partner?.postal_code ?? '',
        city: partner?.city ?? '',
        notes: partner?.notes ?? '',
        notify: false,
    };
}

/** Ajout ou modification d'un partenaire. */
export function PartnerDialog({
    open,
    onOpenChange,
    types,
    partner = null,
    defaultType = '',
}: Props) {
    const form = useForm<PartnerForm>(initial(partner, defaultType));
    const editing = partner !== null;
    const duplicates = useContactDuplicates(
        (query) => partnerDuplicates({ query }).url,
        form.data.email,
        form.data.phone,
        partner?.id ?? '',
        open,
        form.data.name,
    );

    // Le dialogue est monté une fois : on recharge les champs à chaque ouverture.
    useEffect(() => {
        if (open) {
            form.setData(initial(partner, defaultType));
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, partner, defaultType]);

    const submit = () => {
        const options = {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        };

        if (partner) {
            form.patch(update({ partner: partner.uuid }).url, options);
        } else {
            form.post(store().url, options);
        }
    };

    const field = (
        key: 'name' | 'email' | 'website',
        label: string,
        props: { type?: string; placeholder?: string; required?: boolean } = {},
    ) => (
        <div className="grid gap-2">
            <Label htmlFor={`partner-${key}`}>{label}</Label>
            <Input
                id={`partner-${key}`}
                value={form.data[key]}
                onChange={(event) => form.setData(key, event.target.value)}
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
                            ? `Modifier ${partner.name}`
                            : 'Nouveau partenaire'}
                    </DialogTitle>
                    <DialogDescription>
                        {editing
                            ? 'Coordonnées et nature du partenariat.'
                            : 'Nom et type sont obligatoires. Les interlocuteurs s’ajoutent ensuite sur la fiche.'}
                    </DialogDescription>
                </DialogHeader>
                <form
                    className="grid gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit();
                    }}
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_11rem]">
                        {field('name', 'Nom', {
                            placeholder: 'Zen Assurances',
                            required: true,
                        })}
                        <div className="grid gap-2">
                            <Label htmlFor="partner-type">Type</Label>
                            <Select
                                value={form.data.type}
                                onValueChange={(value) =>
                                    form.setData('type', value as PartnerType)
                                }
                            >
                                <SelectTrigger
                                    id="partner-type"
                                    className="w-full"
                                >
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {types.map((type) => (
                                        <SelectItem
                                            key={type.value}
                                            value={type.value}
                                        >
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={form.errors.type} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="partner-phone">Téléphone</Label>
                            <PhoneInput
                                id="partner-phone"
                                value={form.data.phone}
                                onChange={(value) =>
                                    form.setData('phone', value)
                                }
                            />
                            <InputError message={form.errors.phone} />
                        </div>
                        {field('email', 'E-mail', {
                            type: 'email',
                            placeholder: 'contact@…',
                        })}
                    </div>
                    <ContactDuplicatesAlert
                        duplicates={duplicates}
                        noun="partenaire"
                    />
                    {field('website', 'Site web', {
                        type: 'url',
                        placeholder: 'https://…',
                    })}
                    <AddressFields
                        idPrefix="partner"
                        values={{
                            street: form.data.street,
                            postal_code: form.data.postal_code,
                            city: form.data.city,
                        }}
                        errors={form.errors}
                        onChange={(address) =>
                            form.setData({ ...form.data, ...address })
                        }
                    />
                    <div className="grid gap-2">
                        <Label htmlFor="partner-notes">Notes</Label>
                        <Textarea
                            id="partner-notes"
                            rows={3}
                            value={form.data.notes}
                            onChange={(event) =>
                                form.setData('notes', event.target.value)
                            }
                            placeholder="Conditions, tarifs négociés, historique…"
                        />
                        <InputError message={form.errors.notes} />
                    </div>
                    {!editing && (
                        <label
                            htmlFor="partner-notify"
                            className="bg-sidebar flex items-start gap-3 rounded-lg border p-3 text-sm"
                        >
                            <Checkbox
                                id="partner-notify"
                                checked={
                                    form.data.notify &&
                                    form.data.email.trim() !== ''
                                }
                                disabled={form.data.email.trim() === ''}
                                onCheckedChange={(state) =>
                                    form.setData('notify', state === true)
                                }
                                className="mt-0.5"
                            />
                            <span className="grid gap-0.5">
                                <span className="font-medium">
                                    Prévenir le partenaire par e-mail
                                </span>
                                <span className="text-muted-foreground text-xs">
                                    {form.data.email.trim() === ''
                                        ? 'Renseignez un e-mail pour envoyer le message de bienvenue.'
                                        : 'Un message de bienvenue lui indique qu’il rejoint notre annuaire, avec votre contact en réponse.'}
                                </span>
                            </span>
                        </label>
                    )}
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
                            {editing ? 'Enregistrer' : 'Ajouter le partenaire'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
