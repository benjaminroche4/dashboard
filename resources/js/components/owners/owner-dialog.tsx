import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import InputError from '@/components/input-error';
import { PhoneInput } from '@/components/phone-input';
import { AddressFields } from '@/components/real-estate/address-fields';
import { ContactDuplicatesAlert } from '@/components/real-estate/contact-duplicates-alert';
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
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useContactDuplicates } from '@/hooks/use-contact-duplicates';
import { capitalizeName } from '@/lib/format';
import { duplicates as ownerDuplicates, store, update } from '@/routes/owners';
import type { Owner, OwnerForm, OwnerKind, OwnerKindOption } from '@/types';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Particulier ou société (`OwnerKind::options()`). */
    kinds: OwnerKindOption[];
    /** Propriétaire à modifier ; absent pour un ajout. */
    owner?: Owner | null;
};

function initial(owner: Owner | null | undefined): OwnerForm {
    return {
        kind: owner?.kind ?? 'individual',
        first_name: owner?.first_name ?? '',
        last_name: owner?.last_name ?? '',
        company: owner?.company ?? '',
        email: owner?.email ?? '',
        phone: owner?.phone ?? '',
        street: owner?.street ?? '',
        postal_code: owner?.postal_code ?? '',
        city: owner?.city ?? '',
        notes: owner?.notes ?? '',
    };
}

/** Ajout ou modification d'un propriétaire de l'annuaire. */
export function OwnerDialog({
    open,
    onOpenChange,
    kinds,
    owner = null,
}: Props) {
    const form = useForm<OwnerForm>(initial(owner));
    const company = form.data.kind === 'company';
    const editing = owner !== null;
    const duplicates = useContactDuplicates(
        (query) => ownerDuplicates({ query }).url,
        form.data.email,
        form.data.phone,
        owner?.id ?? '',
        open,
    );

    // Le dialogue est monté une fois : on recharge les champs à chaque ouverture.
    useEffect(() => {
        if (open) {
            form.setData(initial(owner));
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, owner]);

    const submit = () => {
        const options = {
            preserveScroll: true,
            // Le dialogue s'ouvre aussi depuis le formulaire d'un bien : la
            // page ne doit pas être remontée, la saisie en cours serait perdue.
            preserveState: true,
            onSuccess: () => onOpenChange(false),
        };

        if (owner) {
            form.patch(update({ owner: owner.uuid }).url, options);
        } else {
            form.post(store().url, options);
        }
    };

    const field = (
        key: 'first_name' | 'last_name' | 'company' | 'email',
        label: string,
        props: {
            type?: string;
            placeholder?: string;
            required?: boolean;
            min?: number;
        } = {},
    ) => (
        <div className="grid gap-2">
            <Label htmlFor={`owner-${key}`}>{label}</Label>
            <Input
                id={`owner-${key}`}
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
                            ? `Modifier ${owner.name}`
                            : 'Nouveau propriétaire'}
                    </DialogTitle>
                    <DialogDescription>
                        {company
                            ? 'La raison sociale nomme la fiche ; l’interlocuteur est facultatif.'
                            : 'Prénom et nom, avec un e-mail ou un téléphone pour le joindre.'}
                    </DialogDescription>
                </DialogHeader>
                <form
                    className="grid gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit();
                    }}
                >
                    <div className="grid gap-2">
                        <Label htmlFor="owner-kind">Type de propriétaire</Label>
                        <Select
                            value={form.data.kind}
                            onValueChange={(value) =>
                                form.setData('kind', value as OwnerKind)
                            }
                        >
                            <SelectTrigger id="owner-kind" className="w-full">
                                <SelectValue placeholder="Type de propriétaire" />
                            </SelectTrigger>
                            <SelectContent>
                                {kinds.map((kind) => (
                                    <SelectItem
                                        key={kind.value}
                                        value={kind.value}
                                    >
                                        {kind.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={form.errors.kind} />
                    </div>
                    {company &&
                        field('company', 'Raison sociale', {
                            required: true,
                            placeholder: 'SCI du Marais, Foncière…',
                        })}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {field(
                            'first_name',
                            company ? 'Prénom de l’interlocuteur' : 'Prénom',
                            { required: !company },
                        )}
                        {field(
                            'last_name',
                            company ? 'Nom de l’interlocuteur' : 'Nom',
                            { required: !company },
                        )}
                    </div>
                    {/* Une ligne chacun : l'indicatif du téléphone et une adresse
                        e-mail complète tiennent mal sur une demi-ligne. */}
                    <div className="grid gap-2">
                        <Label htmlFor="owner-phone">Téléphone</Label>
                        <PhoneInput
                            id="owner-phone"
                            value={form.data.phone}
                            onChange={(value) => form.setData('phone', value)}
                        />
                        <InputError message={form.errors.phone} />
                    </div>
                    {field('email', 'E-mail', {
                        type: 'email',
                        placeholder: 'prenom@…',
                    })}
                    <ContactDuplicatesAlert
                        duplicates={duplicates}
                        noun="propriétaire"
                    />
                    <AddressFields
                        idPrefix="owner"
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
                        <Label htmlFor="owner-notes">Notes</Label>
                        <Textarea
                            id="owner-notes"
                            rows={3}
                            value={form.data.notes}
                            onChange={(event) =>
                                form.setData('notes', event.target.value)
                            }
                            placeholder="Type de biens, loyers, disponibilité, historique des échanges…"
                        />
                        <InputError message={form.errors.notes} />
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
                            {editing
                                ? 'Enregistrer'
                                : 'Ajouter le propriétaire'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
