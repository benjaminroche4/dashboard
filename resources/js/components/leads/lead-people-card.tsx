import { router } from '@inertiajs/react';
import {
    Banknote,
    BriefcaseBusiness,
    Building2,
    Mail,
    Phone,
    UserRoundMinus,
    UserRoundPlus,
} from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { type InlineValue } from '@/components/inline-field';
import { RuledRows, type Fact } from '@/components/leads/lead-show-body';
import { PhoneInput } from '@/components/phone-input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
import { useInitials } from '@/hooks/use-initials';
import { formatMoney } from '@/lib/format';
import type { LabeledOption, LeadPeople, LeadPerson } from '@/types';

export type PersonSlot = LeadPerson['slot'];

/** Clé d'enregistrement d'un champ d'une personne (« co.employer »). */
export function personFieldKey(slot: PersonSlot, name: string): string {
    return `${slot}.${name}`;
}

const icon = (Icon: typeof Mail) => (
    <Icon className="size-3.5 shrink-0" aria-hidden />
);

type Props = {
    people: LeadPeople;
    /** Situations professionnelles proposées par le sélecteur. */
    employmentStatuses: LabeledOption[];
    /** Enregistre un champ d'une personne ; absent, la section se lit seulement. */
    onSave?: (slot: PersonSlot, name: string, value: InlineValue) => void;
    /** Clé `personFieldKey()` du champ en cours d'enregistrement. */
    saving?: string | null;
    /** Refus du serveur par clé `personFieldKey()`. */
    fieldErrors?: Record<string, string>;
    /** Route qui enregistre la seconde personne (PATCH, prénom et nom obligatoires). */
    addUrl: string;
    /** Route qui retire la seconde personne (DELETE). */
    removeUrl: string;
};

/**
 * Les personnes du foyer d'un lead locataire (demandé le 28 octobre 2026) :
 * le lead, nommé par son contact, et la **seconde personne** d'un couple,
 * qu'on ajoute avec son prénom et son nom. Chacune porte sa situation
 * professionnelle, son employeur et son revenu, modifiables en place ; la
 * seconde personne porte aussi son e-mail et son téléphone. Tout est écrit
 * dans les colonnes que le dossier client lit déjà : à la conversion, le
 * couple est là.
 */
export function LeadPeopleCard({
    people,
    employmentStatuses,
    onSave,
    saving = null,
    fieldErrors = {},
    addUrl,
    removeUrl,
}: Props) {
    const [adding, setAdding] = useState(false);
    const [removing, setRemoving] = useState(false);
    const canEdit = onSave !== undefined;

    const remove = () => {
        setRemoving(true);
        router.delete(removeUrl, {
            preserveScroll: true,
            onFinish: () => setRemoving(false),
        });
    };

    return (
        <div className="grid gap-5" data-testid="lead-people">
            <Person
                person={people.primary}
                employmentStatuses={employmentStatuses}
                onSave={onSave}
                saving={saving}
                fieldErrors={fieldErrors}
            />
            {people.co ? (
                <Person
                    person={people.co}
                    employmentStatuses={employmentStatuses}
                    onSave={onSave}
                    saving={saving}
                    fieldErrors={fieldErrors}
                    action={
                        canEdit && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground"
                                disabled={removing}
                                onClick={remove}
                            >
                                {removing ? (
                                    <Spinner className="size-4" />
                                ) : (
                                    <UserRoundMinus aria-hidden />
                                )}
                                Retirer
                            </Button>
                        )
                    }
                />
            ) : (
                canEdit && (
                    <div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setAdding(true)}
                        >
                            <UserRoundPlus aria-hidden />
                            Ajouter une personne
                        </Button>
                        <p className="text-muted-foreground mt-2 text-xs">
                            Un couple, un colocataire : la seconde personne du
                            foyer, avec sa situation professionnelle.
                        </p>
                    </div>
                )
            )}
            <LeadPersonDialog
                open={adding}
                onOpenChange={setAdding}
                url={addUrl}
            />
        </div>
    );
}

/** Une personne : son identité en tête, puis ses lignes à filets. */
function Person({
    person,
    employmentStatuses,
    onSave,
    saving,
    fieldErrors,
    action,
}: {
    person: LeadPerson;
    employmentStatuses: LabeledOption[];
    onSave?: (slot: PersonSlot, name: string, value: InlineValue) => void;
    saving: string | null;
    fieldErrors: Record<string, string>;
    action?: React.ReactNode;
}) {
    const initials = useInitials();
    const co = person.slot === 'co';
    const key = (name: string) => personFieldKey(person.slot, name);

    const facts: Fact[] = [
        // L'identité de la seconde personne se modifie ici ; celle du lead
        // vit dans son contact, à gauche.
        ...(co
            ? ([
                  {
                      label: 'E-mail',
                      icon: icon(Mail),
                      value: person.email,
                      empty: person.email === null,
                      edit: {
                          name: key('email'),
                          kind: 'text',
                          value: person.email,
                      },
                  },
                  {
                      label: 'Téléphone',
                      icon: icon(Phone),
                      value: person.phone,
                      empty: person.phone === null,
                      edit: {
                          name: key('phone'),
                          kind: 'text',
                          value: person.phone,
                      },
                  },
              ] satisfies Fact[])
            : []),
        {
            label: 'Situation pro',
            icon: icon(BriefcaseBusiness),
            value: person.employment_status_label,
            empty: person.employment_status === null,
            edit: {
                name: key('employment_status'),
                kind: 'select',
                value: person.employment_status,
                options: employmentStatuses,
            },
        },
        {
            label: 'Employeur',
            icon: icon(Building2),
            value: person.employer,
            empty: person.employer === null,
            edit: {
                name: key('employer'),
                kind: 'text',
                value: person.employer,
            },
        },
        {
            label: 'Revenu net mensuel',
            icon: icon(Banknote),
            value:
                person.income_cents === null
                    ? null
                    : `${formatMoney(person.income_cents)} / mois`,
            empty: person.income_cents === null,
            edit: {
                name: key('income_cents'),
                kind: 'money',
                value: person.income_cents,
                suffix: '€ / mois',
            },
        },
    ];

    return (
        <section
            aria-label={person.name}
            className="grid gap-3"
            data-slot={person.slot}
        >
            <div className="flex items-center gap-3">
                <Avatar className="size-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                        {initials(person.name)}
                    </AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium">
                            {person.name}
                        </span>
                        <Badge variant="secondary" className="font-normal">
                            {co ? 'Seconde personne' : 'Lead'}
                        </Badge>
                    </span>
                    {!co && (person.email || person.phone) && (
                        <span className="text-muted-foreground truncate text-xs">
                            {[person.email, person.phone]
                                .filter(Boolean)
                                .join(' · ')}
                        </span>
                    )}
                </div>
                {action}
            </div>
            <RuledRows
                facts={facts}
                onSave={
                    onSave
                        ? (name, value) =>
                              onSave(
                                  person.slot,
                                  name.slice(person.slot.length + 1),
                                  value,
                              )
                        : undefined
                }
                saving={saving}
                errors={fieldErrors}
            />
        </section>
    );
}

/**
 * Ajout de la seconde personne : prénom et nom obligatoires, e-mail et
 * téléphone facultatifs. Sa situation professionnelle se complète ensuite en
 * place, comme pour le lead.
 */
export function LeadPersonDialog({
    open,
    onOpenChange,
    url,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    url: string;
}) {
    const [data, setData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const submit = () => {
        setProcessing(true);
        setErrors({});
        router.patch(url, data, {
            preserveScroll: true,
            onSuccess: () => {
                onOpenChange(false);
                setData({
                    first_name: '',
                    last_name: '',
                    email: '',
                    phone: '',
                });
            },
            onError: (serverErrors) => setErrors(serverErrors),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Ajouter une personne</DialogTitle>
                    <DialogDescription>
                        La seconde personne du foyer. Sa situation
                        professionnelle se complète ensuite sur la fiche.
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
                        <div className="grid gap-2">
                            <Label htmlFor="person-first-name">Prénom</Label>
                            <Input
                                id="person-first-name"
                                value={data.first_name}
                                onChange={(event) =>
                                    setData({
                                        ...data,
                                        first_name: event.target.value,
                                    })
                                }
                                autoComplete="off"
                                autoFocus
                            />
                            <InputError message={errors.first_name} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="person-last-name">Nom</Label>
                            <Input
                                id="person-last-name"
                                value={data.last_name}
                                onChange={(event) =>
                                    setData({
                                        ...data,
                                        last_name: event.target.value,
                                    })
                                }
                                autoComplete="off"
                            />
                            <InputError message={errors.last_name} />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="person-email">E-mail</Label>
                        <Input
                            id="person-email"
                            type="email"
                            value={data.email}
                            onChange={(event) =>
                                setData({ ...data, email: event.target.value })
                            }
                            autoComplete="off"
                        />
                        <InputError message={errors.email} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="person-phone">Téléphone</Label>
                        <PhoneInput
                            id="person-phone"
                            name="person_phone"
                            value={data.phone}
                            onChange={(phone) => setData({ ...data, phone })}
                        />
                        <InputError message={errors.phone} />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Annuler
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing && <Spinner className="size-4" />}
                            Ajouter
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
