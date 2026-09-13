import { useForm, usePage } from '@inertiajs/react';
import { FolderPlus } from 'lucide-react';
import { useEffect } from 'react';
import { DatePicker } from '@/components/date-picker';
import { FormGrid, FormSection } from '@/components/form-section';
import InputError from '@/components/input-error';
import { PhoneInput } from '@/components/phone-input';
import { SearchSelect } from '@/components/search-select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { useInitials } from '@/hooks/use-initials';
import { capitalizeName } from '@/lib/format';
import { store as clientsStore } from '@/routes/clients';
import type { DocumentLanguage, LabeledOption } from '@/types';

/** Champs du dossier ouvert sans lead : le contact et l'essentiel du projet. */
type ClientForm = {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    company: string;
    language: DocumentLanguage | '';
    offer: string;
    /** Budget mensuel en unités (« 2500 ») ; converti en centimes à l'envoi. */
    budget: string;
    currency: string;
    arrival_at: string;
    assigned_to: string;
    message: string;
};

const NONE = '__none__';

function empty(currency: string): ClientForm {
    return {
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company: '',
        language: 'fr',
        offer: '',
        budget: '',
        currency,
        arrival_at: '',
        assigned_to: '',
        message: '',
    };
}

/**
 * « Nouveau dossier » : ouvre un dossier client **sans passer par un lead**,
 * pour un client recommandé ou qui a déjà signé. Le reste du projet
 * (arrondissements, garants, pièces) se remplit ensuite sur sa fiche.
 */
export function ClientDialog({
    open,
    onOpenChange,
    languages,
    offers,
    currencies,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    languages: LabeledOption<DocumentLanguage>[];
    offers: { value: string; label: string }[];
    currencies: string[];
}) {
    const { auth, staff } = usePage().props;
    const initials = useInitials();
    const form = useForm<ClientForm>(empty(currencies[0] ?? 'EUR'));

    // Le dialogue est monté une fois : on repart d'un formulaire vide à chaque
    // ouverture, avec le membre connecté comme suivi par défaut.
    useEffect(() => {
        if (open) {
            form.setData({
                ...empty(currencies[0] ?? 'EUR'),
                assigned_to: String(auth.user.id),
            });
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const submit = () => {
        form.transform((data) => ({
            ...data,
            first_name: capitalizeName(data.first_name),
            last_name: capitalizeName(data.last_name),
            language: data.language || null,
            offer: data.offer || null,
            arrival_at: data.arrival_at || null,
            assigned_to: data.assigned_to || null,
            message: data.message.trim() || null,
            company: data.company.trim() || null,
            email: data.email.trim() || null,
            phone: data.phone.trim() || null,
            budget_cents:
                data.budget.trim() === ''
                    ? null
                    : Math.round(
                          Number.parseFloat(
                              data.budget.replace(/\s/g, '').replace(',', '.'),
                          ) * 100,
                      ),
        }));

        form.post(clientsStore().url, {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    const field = (
        key: 'first_name' | 'last_name' | 'email' | 'company' | 'budget',
        label: string,
        props: { type?: string; required?: boolean; placeholder?: string } = {},
    ) => (
        <div className="grid gap-2">
            <Label htmlFor={`client-${key}`}>
                {label}
                {props.required && <span className="text-red-600"> *</span>}
            </Label>
            <Input
                id={`client-${key}`}
                type={props.type}
                value={form.data[key]}
                onChange={(event) => form.setData(key, event.target.value)}
                placeholder={props.placeholder}
                autoComplete="off"
            />
            <InputError message={form.errors[key]} />
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Nouveau dossier client</DialogTitle>
                    <DialogDescription>
                        Pour un client recommandé ou qui a déjà signé : le
                        dossier s’ouvre directement, sans passer par un lead.
                    </DialogDescription>
                </DialogHeader>

                <form
                    className="grid gap-5"
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit();
                    }}
                >
                    <FormSection
                        variant="plain"
                        title="Le client"
                        hint="Un e-mail ou un téléphone suffit pour le joindre."
                    >
                        <FormGrid>
                            {field('first_name', 'Prénom', { required: true })}
                            {field('last_name', 'Nom', { required: true })}
                            {field('email', 'E-mail', { type: 'email' })}
                            <div className="grid gap-2">
                                <Label htmlFor="client-phone">Téléphone</Label>
                                <PhoneInput
                                    id="client-phone"
                                    value={form.data.phone}
                                    onChange={(value) =>
                                        form.setData('phone', value)
                                    }
                                />
                                <InputError message={form.errors.phone} />
                            </div>
                            {field('company', 'Société')}
                            <div className="grid gap-2">
                                <Label htmlFor="client-language">Langue</Label>
                                <Select
                                    value={form.data.language || NONE}
                                    onValueChange={(value) =>
                                        form.setData(
                                            'language',
                                            value === NONE
                                                ? ''
                                                : (value as DocumentLanguage),
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="client-language"
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="Langue de contact" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {languages.map((language) => (
                                            <SelectItem
                                                key={language.value}
                                                value={language.value}
                                            >
                                                {language.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={form.errors.language} />
                            </div>
                        </FormGrid>
                    </FormSection>

                    <FormSection
                        variant="plain"
                        title="Son projet"
                        hint="Le reste se complète ensuite sur la fiche du dossier."
                    >
                        <FormGrid>
                            <div className="grid gap-2">
                                <Label htmlFor="client-offer">Formule</Label>
                                <Select
                                    value={form.data.offer || NONE}
                                    onValueChange={(value) =>
                                        form.setData(
                                            'offer',
                                            value === NONE ? '' : value,
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="client-offer"
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="Pas encore choisie" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={NONE}>
                                            Pas encore choisie
                                        </SelectItem>
                                        {offers.map((offer) => (
                                            <SelectItem
                                                key={offer.value}
                                                value={offer.value}
                                            >
                                                {offer.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={form.errors.offer} />
                            </div>
                            {field('budget', 'Budget mensuel', {
                                type: 'number',
                                placeholder: '2500',
                            })}
                            <div className="grid gap-2">
                                <Label htmlFor="client-arrival">Arrivée</Label>
                                <DatePicker
                                    id="client-arrival"
                                    value={form.data.arrival_at}
                                    onChange={(iso) =>
                                        form.setData('arrival_at', iso)
                                    }
                                />
                                <InputError message={form.errors.arrival_at} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="client-assigned">
                                    Suivi par
                                </Label>
                                <SearchSelect
                                    id="client-assigned"
                                    value={form.data.assigned_to}
                                    onChange={(value) =>
                                        form.setData('assigned_to', value)
                                    }
                                    options={staff.map((member) => ({
                                        value: String(member.id),
                                        label:
                                            member.id === auth.user.id
                                                ? `${member.name} · moi`
                                                : member.name,
                                        hint:
                                            member.functions?.join(', ') ??
                                            null,
                                        leading: (
                                            <Avatar className="size-6">
                                                {member.avatar && (
                                                    <AvatarImage
                                                        src={member.avatar}
                                                        alt=""
                                                    />
                                                )}
                                                <AvatarFallback className="text-[10px]">
                                                    {initials(member.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                        ),
                                    }))}
                                    placeholder="Personne pour l’instant"
                                    emptyLabel="Personne pour l’instant"
                                    searchPlaceholder="Rechercher un membre…"
                                    noResults="Aucun membre ne correspond."
                                />
                                <InputError message={form.errors.assigned_to} />
                            </div>
                        </FormGrid>
                        <div className="grid gap-2">
                            <Label htmlFor="client-message">Note</Label>
                            <Textarea
                                id="client-message"
                                rows={3}
                                value={form.data.message}
                                onChange={(event) =>
                                    form.setData('message', event.target.value)
                                }
                                placeholder="Contexte du dossier, recommandation, contraintes…"
                            />
                            <InputError message={form.errors.message} />
                        </div>
                    </FormSection>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                        >
                            Annuler
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? <Spinner /> : <FolderPlus />}
                            Ouvrir le dossier
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
