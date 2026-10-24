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
    duplicates as companyDuplicates,
    store,
    update,
} from '@/routes/companies';
import type { CompanyEntry, CompanyForm } from '@/types';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Entreprise à modifier ; absente pour un ajout. */
    company?: CompanyEntry | null;
};

function initial(company: CompanyEntry | null | undefined): CompanyForm {
    return {
        name: company?.name ?? '',
        email: company?.email ?? '',
        phone: company?.phone ?? '',
        website: company?.website ?? '',
        street: company?.street ?? '',
        postal_code: company?.postal_code ?? '',
        city: company?.city ?? '',
        notes: company?.notes ?? '',
    };
}

/** Ajout ou modification d'une entreprise. */
export function CompanyDialog({ open, onOpenChange, company = null }: Props) {
    const form = useForm<CompanyForm>(initial(company));
    const editing = company !== null;
    const duplicates = useContactDuplicates(
        (query) => companyDuplicates({ query }).url,
        form.data.email,
        form.data.phone,
        company?.id ?? '',
        open,
        form.data.name,
    );

    // Le dialogue est monté une fois : on recharge les champs à chaque ouverture.
    useEffect(() => {
        if (open) {
            form.setData(initial(company));
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, company]);

    const submit = () => {
        const options = {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        };

        if (company) {
            form.patch(update({ company: company.uuid }).url, options);
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
            <Label htmlFor={`company-${key}`}>{label}</Label>
            <Input
                id={`company-${key}`}
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
                            ? `Modifier ${company.name}`
                            : 'Nouvelle entreprise'}
                    </DialogTitle>
                    <DialogDescription>
                        {editing
                            ? 'Coordonnées de l’entreprise.'
                            : 'Seul le nom est obligatoire. Les contacts principaux et les dossiers clients s’ajoutent ensuite sur la fiche.'}
                    </DialogDescription>
                </DialogHeader>
                <form
                    className="grid gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit();
                    }}
                >
                    {field('name', 'Nom', {
                        placeholder: 'Zen Conseil',
                        required: true,
                    })}
                    {/* Une ligne pleine largeur chacun : l'indicatif du téléphone
                        et une adresse e-mail complète tiennent mal sur une demi-ligne. */}
                    <div className="grid gap-2">
                        <Label htmlFor="company-phone">Téléphone</Label>
                        <PhoneInput
                            id="company-phone"
                            value={form.data.phone}
                            onChange={(value) => form.setData('phone', value)}
                        />
                        <InputError message={form.errors.phone} />
                    </div>
                    {field('email', 'E-mail', {
                        type: 'email',
                        placeholder: 'rh@…',
                    })}
                    <ContactDuplicatesAlert
                        duplicates={duplicates}
                        noun="entreprise"
                    />
                    {field('website', 'Site web', {
                        type: 'url',
                        placeholder: 'https://…',
                    })}
                    <AddressFields
                        idPrefix="company"
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
                        <Label htmlFor="company-notes">Notes</Label>
                        <Textarea
                            id="company-notes"
                            rows={3}
                            value={form.data.notes}
                            onChange={(event) =>
                                form.setData('notes', event.target.value)
                            }
                            placeholder="Accord cadre, politique de relogement, historique…"
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
                            {editing ? 'Enregistrer' : 'Ajouter l’entreprise'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
