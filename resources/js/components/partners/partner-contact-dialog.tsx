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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { contactFunctions } from '@/lib/contact-functions';
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
        position: contact?.position_value ?? '',
        is_primary: contact?.is_primary ?? false,
        email: contact?.email ?? '',
        phone: contact?.phone ?? '',
    };
}

/** Valeur du choix « Sans fonction » (Radix refuse une valeur vide). */
const NONE = '__none__';

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
        key: 'first_name' | 'last_name' | 'email',
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
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {field('first_name', 'Prénom', { required: true })}
                        {field('last_name', 'Nom', { required: true })}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="contact-position">Fonction</Label>
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
                                id="contact-position"
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
                    {/* Un seul interlocuteur principal : c'est lui que l'on joint d'abord. */}
                    <label
                        htmlFor="contact-primary"
                        className="hover:bg-accent/40 flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors"
                    >
                        <Checkbox
                            id="contact-primary"
                            checked={form.data.is_primary}
                            onCheckedChange={(state) =>
                                form.setData('is_primary', state === true)
                            }
                            className="mt-0.5"
                        />
                        <span className="grid gap-0.5">
                            <span className="text-sm font-medium">
                                Interlocuteur principal
                            </span>
                            <span className="text-muted-foreground text-xs">
                                Celui que l’équipe joint d’abord chez ce
                                partenaire.
                            </span>
                        </span>
                    </label>
                    {/* Téléphone et e-mail chacun sur sa ligne : l'indicatif et
                        l'adresse ont besoin de toute la largeur. */}
                    <div className="grid gap-4">
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
