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
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useContactDuplicates } from '@/hooks/use-contact-duplicates';
import {
    duplicates as agencyDuplicates,
    store,
    update,
} from '@/routes/agencies';
import type { Agency, AgencyForm } from '@/types';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Agence à modifier ; absente pour un ajout. */
    agency?: Agency | null;
};

function initial(agency: Agency | null | undefined): AgencyForm {
    return {
        name: agency?.name ?? '',
        street: agency?.street ?? '',
        postal_code: agency?.postal_code ?? '',
        city: agency?.city ?? '',
        phone: agency?.phone ?? '',
        email: agency?.email ?? '',
        website: agency?.website ?? '',
        notes: agency?.notes ?? '',
    };
}

/** Ajout ou modification d'une agence immobilière partenaire. */
export function AgencyDialog({ open, onOpenChange, agency = null }: Props) {
    const form = useForm<AgencyForm>(initial(agency));
    const editing = agency !== null;
    const duplicates = useContactDuplicates(
        (query) => agencyDuplicates({ query }).url,
        form.data.email,
        form.data.phone,
        agency?.id ?? '',
        open,
    );

    // Le dialogue est monté une fois : on recharge les champs à chaque ouverture.
    useEffect(() => {
        if (open) {
            form.setData(initial(agency));
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, agency]);

    const submit = () => {
        const options = {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        };

        if (agency) {
            form.patch(update({ agency: agency.uuid }).url, options);
        } else {
            form.post(store().url, options);
        }
    };

    const field = (
        key: keyof AgencyForm,
        label: string,
        props: {
            type?: string;
            placeholder?: string;
            autoComplete?: string;
        } = {},
    ) => (
        <div className="grid gap-2">
            <Label htmlFor={`agency-${key}`}>{label}</Label>
            <Input
                id={`agency-${key}`}
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
                            ? `Modifier ${agency.name}`
                            : 'Nouvelle agence'}
                    </DialogTitle>
                    <DialogDescription>
                        {editing
                            ? 'Les agents rattachés suivent automatiquement.'
                            : 'Coordonnées de l’agence partenaire. Seul le nom est obligatoire.'}
                    </DialogDescription>
                </DialogHeader>
                <form
                    className="grid gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit();
                    }}
                >
                    {field('name', 'Nom', { placeholder: 'Agence du Marais' })}
                    <AddressFields
                        idPrefix="agency"
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
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="agency-phone">Téléphone</Label>
                            <PhoneInput
                                id="agency-phone"
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
                        noun="agence"
                    />
                    {field('website', 'Site web', {
                        type: 'url',
                        placeholder: 'https://…',
                    })}
                    <div className="grid gap-2">
                        <Label htmlFor="agency-notes">Notes</Label>
                        <Textarea
                            id="agency-notes"
                            rows={3}
                            value={form.data.notes}
                            onChange={(event) =>
                                form.setData('notes', event.target.value)
                            }
                            placeholder="Spécialités, quartiers, conditions…"
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
                            {editing ? 'Enregistrer' : 'Ajouter l’agence'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
