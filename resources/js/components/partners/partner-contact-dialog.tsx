import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import InputError from '@/components/input-error';
import { PhoneInput } from '@/components/phone-input';
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
import { capitalizeName } from '@/lib/format';
import { store, update } from '@/routes/partners/contacts';
import type { PartnerContact, PartnerContactForm } from '@/types';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    partnerUuid: string;
    /** Interlocuteur à modifier ; absent pour un ajout. */
    contact?: PartnerContact | null;
};

function initial(
    contact: PartnerContact | null | undefined,
): PartnerContactForm {
    return {
        first_name: contact?.first_name ?? '',
        last_name: contact?.last_name ?? '',
        position: contact?.position ?? '',
        email: contact?.email ?? '',
        phone: contact?.phone ?? '',
    };
}

/** Ajout ou modification d'un interlocuteur chez un partenaire. */
export function PartnerContactDialog({
    open,
    onOpenChange,
    partnerUuid,
    contact = null,
}: Props) {
    const form = useForm<PartnerContactForm>(initial(contact));
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
                update({ partner: partnerUuid, contact: contact.id }).url,
                options,
            );
        } else {
            form.post(store({ partner: partnerUuid }).url, options);
        }
    };

    const field = (
        key: 'first_name' | 'last_name' | 'position' | 'email',
        label: string,
        props: { type?: string; placeholder?: string; required?: boolean } = {},
    ) => (
        <div className="grid gap-2">
            <Label htmlFor={`contact-${key}`}>{label}</Label>
            <Input
                id={`contact-${key}`}
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
                            : 'Nouvel interlocuteur'}
                    </DialogTitle>
                    <DialogDescription>
                        Personne à joindre chez le partenaire. Prénom et nom
                        sont obligatoires.
                    </DialogDescription>
                </DialogHeader>
                <form
                    className="grid gap-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit();
                    }}
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        {field('first_name', 'Prénom', { required: true })}
                        {field('last_name', 'Nom', { required: true })}
                    </div>
                    {field('position', 'Fonction', {
                        placeholder: 'Commercial, gestionnaire…',
                    })}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="contact-phone">Téléphone</Label>
                            <PhoneInput
                                id="contact-phone"
                                value={form.data.phone}
                                onChange={(value) =>
                                    form.setData('phone', value)
                                }
                            />
                            <InputError message={form.errors.phone} />
                        </div>
                        {field('email', 'E-mail', {
                            type: 'email',
                            placeholder: 'prenom@partenaire.fr',
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
                            {editing
                                ? 'Enregistrer'
                                : 'Ajouter l’interlocuteur'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
