import { Head, Link, useForm } from '@inertiajs/react';
import { Star } from 'lucide-react';
import type { FormEvent } from 'react';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
import { DistrictMap } from '@/components/leads/district-map';
import { PhoneInput } from '@/components/phone-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toCents } from '@/lib/invoice-totals';
import { cn } from '@/lib/utils';
import {
    index as leadsIndex,
    show as leadShow,
    store,
    update,
} from '@/routes/leads';
import type {
    Currency,
    Furnished,
    GuarantorType,
    LabeledOption,
    LeadDuration,
    LeadEditable,
    LeadForm,
    LeadLanguage,
    LeadSource,
    OfferValue,
    PropertyType,
    RecontactChannel,
} from '@/types';

type Props = {
    offers: { value: OfferValue; label: string; description: string }[];
    sources: LabeledOption<LeadSource>[];
    currencies: LabeledOption<Currency>[];
    defaultCurrency: Currency;
    languages: LabeledOption<LeadLanguage>[];
    propertyTypes: LabeledOption<PropertyType>[];
    durations: LabeledOption<LeadDuration>[];
    guarantors: LabeledOption<GuarantorType>[];
    furnishedOptions: LabeledOption<Furnished>[];
    recontactChannels: LabeledOption<RecontactChannel>[];
    /** Présent en mode modification. */
    lead?: LeadEditable;
};

/** Ne garde que les champs du formulaire (sans id ni nom composé). */
function toForm(lead: LeadEditable): LeadForm {
    const { id: _id, name: _name, ...form } = lead;

    return form;
}

function Section({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <section className="grid gap-5">
            <div>
                <h2 className="text-base font-medium">{title}</h2>
                <p className="text-muted-foreground text-sm">{description}</p>
            </div>
            {children}
        </section>
    );
}

function Field({
    label,
    htmlFor,
    error,
    children,
    className,
}: {
    label: string;
    htmlFor?: string;
    error?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('grid gap-2', className)}>
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
            <InputError message={error} />
        </div>
    );
}

/**
 * Converting Machine : le formulaire de qualification d'un prospect,
 * aussi utilisé pour modifier un lead existant.
 */
export default function LeadsCreate({
    offers,
    sources,
    currencies,
    defaultCurrency,
    languages,
    propertyTypes,
    durations,
    guarantors,
    furnishedOptions,
    recontactChannels,
    lead,
}: Props) {
    const editing = lead !== undefined;
    const form = useForm<LeadForm>(
        lead
            ? { ...toForm(lead) }
            : {
                  first_name: '',
                  last_name: '',
                  email: '',
                  phone: '',
                  company: '',
                  language: 'fr',
                  offer: '',
                  source: sources[0]?.value ?? 'website',
                  source_note: '',
                  budget: '',
                  currency: defaultCurrency,
                  arrival_at: '',
                  origin_city: '',
                  districts: [],
                  property_types: [],
                  duration: '',
                  guarantor: '',
                  furnished: '',
                  message: '',
                  score: null,
                  recontact_channel: '',
                  recontact_at: '',
                  qualification_note: '',
              },
    );
    const errors = form.errors as Record<string, string | undefined>;
    const set =
        <K extends keyof LeadForm>(key: K) =>
        (value: LeadForm[K]) =>
            form.setData((data) => ({ ...data, [key]: value }));
    const selectOptions = <T extends string>(
        options: LabeledOption<T>[],
        none: string,
    ) => (
        <SelectContent>
            <SelectItem value="none">{none}</SelectItem>
            {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                    {option.label}
                </SelectItem>
            ))}
        </SelectContent>
    );

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.transform((data) => ({
            ...data,
            offer: data.offer === '' ? null : data.offer,
            arrival_at: data.arrival_at === '' ? null : data.arrival_at,
            recontact_at: data.recontact_at === '' ? null : data.recontact_at,
            duration: data.duration === '' ? null : data.duration,
            guarantor: data.guarantor === '' ? null : data.guarantor,
            furnished: data.furnished === '' ? null : data.furnished,
            recontact_channel:
                data.recontact_channel === '' ? null : data.recontact_channel,
            budget_cents:
                data.budget.trim() === '' ? null : toCents(data.budget),
        }));

        if (lead) {
            form.put(update({ lead: lead.id }).url);
        } else {
            form.post(store().url);
        }
    };

    return (
        <>
            <Head
                title={editing ? `Modifier ${lead.name}` : 'Converting Machine'}
            />
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-10">
                <div className="flex items-end justify-between pt-8 pb-6">
                    <div>
                        <h1 className="text-lg font-medium">
                            {editing
                                ? `Modifier ${lead.name}`
                                : 'Converting Machine'}
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            {editing
                                ? 'Le statut et la place dans le kanban ne changent pas.'
                                : 'Qualifiez un prospect : contact, projet logement, qualité du lead.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button type="button" variant="ghost" asChild>
                            <Link
                                href={
                                    lead
                                        ? leadShow({ lead: lead.id })
                                        : leadsIndex()
                                }
                            >
                                Annuler
                            </Link>
                        </Button>
                        <Button
                            type="submit"
                            form="lead-form"
                            disabled={form.processing}
                        >
                            {form.processing && <Spinner />}
                            {editing ? 'Enregistrer' : 'Ajouter le lead'}
                        </Button>
                    </div>
                </div>

                <form
                    id="lead-form"
                    onSubmit={submit}
                    className="grid gap-8"
                    data-test="lead-form"
                >
                    <Section
                        title="Contact"
                        description="Un e-mail ou un téléphone suffit pour commencer."
                    >
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field
                                label="Nom"
                                htmlFor="last_name"
                                error={errors.last_name}
                            >
                                <Input
                                    id="last_name"
                                    name="last_name"
                                    required
                                    autoFocus
                                    autoComplete="off"
                                    className="bg-background"
                                    value={form.data.last_name}
                                    onChange={(e) =>
                                        set('last_name')(e.target.value)
                                    }
                                />
                            </Field>
                            <Field
                                label="Prénom"
                                htmlFor="first_name"
                                error={errors.first_name}
                            >
                                <Input
                                    id="first_name"
                                    name="first_name"
                                    required
                                    autoComplete="off"
                                    className="bg-background"
                                    value={form.data.first_name}
                                    onChange={(e) =>
                                        set('first_name')(e.target.value)
                                    }
                                />
                            </Field>
                            <Field
                                label="E-mail"
                                htmlFor="email"
                                error={errors.email}
                            >
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="off"
                                    className="bg-background"
                                    value={form.data.email}
                                    onChange={(e) =>
                                        set('email')(e.target.value)
                                    }
                                />
                            </Field>
                            <Field
                                label="Téléphone"
                                htmlFor="phone"
                                error={errors.phone}
                            >
                                <PhoneInput
                                    id="phone"
                                    value={form.data.phone}
                                    onChange={set('phone')}
                                />
                            </Field>
                            <Field
                                label="Société"
                                htmlFor="company"
                                error={errors.company}
                            >
                                <Input
                                    id="company"
                                    name="company"
                                    autoComplete="off"
                                    className="bg-background"
                                    value={form.data.company}
                                    onChange={(e) =>
                                        set('company')(e.target.value)
                                    }
                                />
                            </Field>
                            <Field label="Langue" error={errors.language}>
                                <ToggleGroup
                                    type="single"
                                    variant="outline"
                                    value={form.data.language}
                                    onValueChange={(value) => {
                                        if (value) {
                                            set('language')(
                                                value as LeadLanguage,
                                            );
                                        }
                                    }}
                                    aria-label="Langue"
                                    className="justify-start"
                                >
                                    {languages.map((language) => (
                                        <ToggleGroupItem
                                            key={language.value}
                                            value={language.value}
                                            className="bg-background px-4"
                                        >
                                            {language.label}
                                        </ToggleGroupItem>
                                    ))}
                                </ToggleGroup>
                            </Field>
                        </div>
                        <Field label="Formule choisie" error={errors.offer}>
                            <RadioGroup
                                value={form.data.offer}
                                onValueChange={(value) =>
                                    set('offer')(value as OfferValue)
                                }
                                className="grid gap-3 sm:grid-cols-2"
                            >
                                {offers.map((offer) => (
                                    <Label
                                        key={offer.value}
                                        htmlFor={`offer-${offer.value}`}
                                        className="bg-background has-data-[state=checked]:border-primary flex cursor-pointer items-start gap-3 rounded-lg border p-4 font-normal"
                                    >
                                        <RadioGroupItem
                                            id={`offer-${offer.value}`}
                                            value={offer.value}
                                            aria-label={offer.label}
                                            className="mt-0.5"
                                        />
                                        <span className="grid gap-1">
                                            <span className="font-medium">
                                                {offer.label}
                                            </span>
                                            <span className="text-muted-foreground text-sm">
                                                {offer.description}
                                            </span>
                                        </span>
                                    </Label>
                                ))}
                            </RadioGroup>
                        </Field>
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field
                                label="Source du lead"
                                htmlFor="source"
                                error={errors.source}
                            >
                                <Select
                                    value={form.data.source}
                                    onValueChange={(value) =>
                                        set('source')(value as LeadSource)
                                    }
                                >
                                    <SelectTrigger
                                        id="source"
                                        aria-label="Source"
                                        className="bg-background w-full"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sources.map((source) => (
                                            <SelectItem
                                                key={source.value}
                                                value={source.value}
                                            >
                                                {source.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field
                                label="Précision sur la source"
                                htmlFor="source_note"
                                error={errors.source_note}
                            >
                                <Input
                                    id="source_note"
                                    name="source_note"
                                    autoComplete="off"
                                    placeholder="Recommandé par…, campagne…"
                                    className="bg-background"
                                    value={form.data.source_note}
                                    onChange={(e) =>
                                        set('source_note')(e.target.value)
                                    }
                                />
                            </Field>
                        </div>
                    </Section>

                    <Separator />

                    <Section
                        title="Projet logement"
                        description="Ce que le prospect cherche à Paris."
                    >
                        <div className="grid gap-5 sm:grid-cols-3">
                            <Field
                                label="Budget mensuel"
                                htmlFor="budget"
                                error={errors.budget_cents}
                            >
                                <Input
                                    id="budget"
                                    name="budget"
                                    inputMode="decimal"
                                    placeholder="2500"
                                    className="bg-background"
                                    value={form.data.budget}
                                    onChange={(e) =>
                                        set('budget')(e.target.value)
                                    }
                                />
                            </Field>
                            <Field label="Devise" htmlFor="currency">
                                <Select
                                    value={form.data.currency}
                                    onValueChange={(value) =>
                                        set('currency')(value as Currency)
                                    }
                                >
                                    <SelectTrigger
                                        id="currency"
                                        aria-label="Devise"
                                        className="bg-background w-full"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {currencies.map((currency) => (
                                            <SelectItem
                                                key={currency.value}
                                                value={currency.value}
                                            >
                                                {currency.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field
                                label="Emménagement souhaité"
                                htmlFor="arrival_at"
                                error={errors.arrival_at}
                            >
                                <DatePicker
                                    id="arrival_at"
                                    aria-label="Emménagement souhaité"
                                    value={form.data.arrival_at}
                                    onChange={set('arrival_at')}
                                />
                            </Field>
                        </div>
                        <Field label="Quartiers visés" error={errors.districts}>
                            <DistrictMap
                                value={form.data.districts}
                                onChange={set('districts')}
                            />
                        </Field>
                        <Field
                            label="Type de bien"
                            error={errors.property_types}
                        >
                            <ToggleGroup
                                type="multiple"
                                variant="outline"
                                value={form.data.property_types}
                                onValueChange={(value) =>
                                    set('property_types')(
                                        value as PropertyType[],
                                    )
                                }
                                aria-label="Type de bien"
                                className="flex-wrap justify-start gap-2"
                            >
                                {propertyTypes.map((type) => (
                                    <ToggleGroupItem
                                        key={type.value}
                                        value={type.value}
                                        className="bg-background data-[state=on]:border-primary rounded-md border px-3 first:rounded-md last:rounded-md"
                                    >
                                        {type.label}
                                    </ToggleGroupItem>
                                ))}
                            </ToggleGroup>
                        </Field>
                        <div className="grid gap-5 sm:grid-cols-3">
                            <Field
                                label="Durée d'installation"
                                htmlFor="duration"
                                error={errors.duration}
                            >
                                <Select
                                    value={
                                        form.data.duration === ''
                                            ? 'none'
                                            : form.data.duration
                                    }
                                    onValueChange={(value) =>
                                        set('duration')(
                                            value === 'none'
                                                ? ''
                                                : (value as LeadDuration),
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="duration"
                                        aria-label="Durée d'installation"
                                        className="bg-background w-full"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    {selectOptions(durations, 'À définir')}
                                </Select>
                            </Field>
                            <Field
                                label="Type de garant"
                                htmlFor="guarantor"
                                error={errors.guarantor}
                            >
                                <Select
                                    value={
                                        form.data.guarantor === ''
                                            ? 'none'
                                            : form.data.guarantor
                                    }
                                    onValueChange={(value) =>
                                        set('guarantor')(
                                            value === 'none'
                                                ? ''
                                                : (value as GuarantorType),
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="guarantor"
                                        aria-label="Type de garant"
                                        className="bg-background w-full"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    {selectOptions(guarantors, 'À définir')}
                                </Select>
                            </Field>
                            <Field
                                label="Meublé"
                                htmlFor="furnished"
                                error={errors.furnished}
                            >
                                <Select
                                    value={
                                        form.data.furnished === ''
                                            ? 'none'
                                            : form.data.furnished
                                    }
                                    onValueChange={(value) =>
                                        set('furnished')(
                                            value === 'none'
                                                ? ''
                                                : (value as Furnished),
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="furnished"
                                        aria-label="Meublé"
                                        className="bg-background w-full"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    {selectOptions(
                                        furnishedOptions,
                                        'À définir',
                                    )}
                                </Select>
                            </Field>
                        </div>
                        <Field
                            label="Ville d'origine"
                            htmlFor="origin_city"
                            error={errors.origin_city}
                        >
                            <Input
                                id="origin_city"
                                name="origin_city"
                                autoComplete="off"
                                className="bg-background"
                                value={form.data.origin_city}
                                onChange={(e) =>
                                    set('origin_city')(e.target.value)
                                }
                            />
                        </Field>
                        <Field
                            label="Note sur le projet"
                            htmlFor="message"
                            error={errors.message}
                        >
                            <Textarea
                                id="message"
                                name="message"
                                rows={4}
                                className="bg-background"
                                placeholder="Besoins, contraintes, contexte…"
                                value={form.data.message}
                                onChange={(e) => set('message')(e.target.value)}
                            />
                        </Field>
                    </Section>

                    <Separator />

                    <Section
                        title="Qualité du lead"
                        description="Votre évaluation et la suite à donner."
                    >
                        <div className="grid gap-2">
                            <Label id="score-label">Note</Label>
                            <div
                                role="radiogroup"
                                aria-labelledby="score-label"
                                className="flex items-center gap-1"
                            >
                                {[1, 2, 3, 4, 5].map((value) => {
                                    const active =
                                        form.data.score !== null &&
                                        value <= form.data.score;

                                    return (
                                        <button
                                            key={value}
                                            type="button"
                                            role="radio"
                                            aria-checked={
                                                form.data.score === value
                                            }
                                            aria-label={`${value} sur 5`}
                                            onClick={() =>
                                                set('score')(
                                                    form.data.score === value
                                                        ? null
                                                        : value,
                                                )
                                            }
                                            className={cn(
                                                'rounded-md p-1 transition-colors',
                                                active
                                                    ? 'text-amber-500'
                                                    : 'text-muted-foreground/40 hover:text-amber-400',
                                            )}
                                        >
                                            <Star
                                                className={cn(
                                                    'size-6',
                                                    active && 'fill-current',
                                                )}
                                                aria-hidden
                                            />
                                        </button>
                                    );
                                })}
                                <span className="text-muted-foreground ml-2 text-sm">
                                    {form.data.score === null
                                        ? 'Non évaluée'
                                        : `${form.data.score} / 5`}
                                </span>
                            </div>
                            <InputError message={errors.score} />
                        </div>
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field
                                label="Recontacter par"
                                htmlFor="recontact_channel"
                                error={errors.recontact_channel}
                            >
                                <Select
                                    value={
                                        form.data.recontact_channel === ''
                                            ? 'none'
                                            : form.data.recontact_channel
                                    }
                                    onValueChange={(value) =>
                                        set('recontact_channel')(
                                            value === 'none'
                                                ? ''
                                                : (value as RecontactChannel),
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="recontact_channel"
                                        aria-label="Recontacter par"
                                        className="bg-background w-full"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    {selectOptions(
                                        recontactChannels,
                                        'Pas de recontact prévu',
                                    )}
                                </Select>
                            </Field>
                            <Field
                                label="Recontacter le"
                                htmlFor="recontact_at"
                                error={errors.recontact_at}
                            >
                                <DatePicker
                                    id="recontact_at"
                                    aria-label="Recontacter le"
                                    value={form.data.recontact_at}
                                    onChange={set('recontact_at')}
                                />
                            </Field>
                        </div>
                        <Field
                            label="Note de qualification"
                            htmlFor="qualification_note"
                            error={errors.qualification_note}
                        >
                            <Textarea
                                id="qualification_note"
                                name="qualification_note"
                                rows={3}
                                className="bg-background"
                                placeholder="Motivation, solvabilité, points d'attention…"
                                value={form.data.qualification_note}
                                onChange={(e) =>
                                    set('qualification_note')(e.target.value)
                                }
                            />
                        </Field>
                    </Section>
                </form>
            </div>
        </>
    );
}

LeadsCreate.layout = {
    breadcrumbs: [
        { title: 'Leads', href: leadsIndex() },
        { title: 'Converting Machine', href: '#' },
    ],
};
