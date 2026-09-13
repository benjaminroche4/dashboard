import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { House, MapPin, NotebookPen, UserRound, Wallet } from 'lucide-react';
import { AddressAutocomplete } from '@/components/address-autocomplete';
import { CountryFlag } from '@/components/country-flag';
import { DatePicker } from '@/components/date-picker';
import { FormGrid, FormSection } from '@/components/form-section';
import InputError from '@/components/input-error';
import {
    ChoicePills,
    ConditionChoices,
} from '@/components/leads/condition-choices';
import { DistrictMap } from '@/components/leads/district-map';
import { PhoneInput } from '@/components/phone-input';
import { Button } from '@/components/ui/button';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toCents } from '@/lib/invoice-totals';
import { index as clientsIndex, show, update } from '@/routes/clients';
import type {
    Currency,
    Furnished,
    GuarantorType,
    LabeledOption,
    LeadDuration,
    LeadLanguage,
    LeadOfferOption,
    OfferValue,
    PropertyType,
} from '@/types';

/** Le dossier tel qu'il arrive du serveur : des chaînes, prêtes à saisir. */
export type ClientEditable = {
    uuid: string;
    name: string;
    reference: string | null;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    company: string;
    language: LeadLanguage;
    offer: OfferValue | '';
    budget: string;
    currency: Currency;
    arrival_at: string;
    districts: number[];
    property_types: PropertyType[];
    duration: LeadDuration | '';
    guarantors: GuarantorType[];
    furnished: Furnished | '';
    origin_city: string;
    message: string;
};

type Props = {
    client: ClientEditable;
    offers: LeadOfferOption[];
    languages: LabeledOption<LeadLanguage>[];
    propertyTypes: LabeledOption<PropertyType>[];
    durations: LabeledOption<LeadDuration>[];
    guarantors: LabeledOption<GuarantorType>[];
    furnishedOptions: LabeledOption<Furnished>[];
    currencies: LabeledOption<Currency>[];
};

/** Champ d'un bloc : intitulé, champ, erreur. */
function Field({
    label,
    htmlFor,
    error,
    children,
}: {
    label: string;
    htmlFor?: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="grid content-start gap-2">
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
            <InputError message={error} />
        </div>
    );
}

/**
 * Modification d'un dossier client, sur sa propre page : le dossier ne
 * dépend plus de la fiche lead. On y reprend les coordonnées du client et son
 * projet de logement ; la qualification et le suivi restent sur le lead.
 */
export default function ClientEdit({
    client,
    offers,
    languages,
    propertyTypes,
    durations,
    guarantors,
    furnishedOptions,
    currencies,
}: Props) {
    const { features } = usePage().props;
    const form = useForm({
        first_name: client.first_name,
        last_name: client.last_name,
        email: client.email,
        phone: client.phone,
        company: client.company,
        language: client.language,
        offer: client.offer,
        budget: client.budget,
        currency: client.currency,
        arrival_at: client.arrival_at,
        districts: client.districts,
        property_types: client.property_types,
        duration: client.duration,
        guarantors: client.guarantors,
        furnished: client.furnished,
        origin_city: client.origin_city,
        message: client.message,
    });
    const errors = form.errors as Record<string, string | undefined>;
    const dossier = show({ lead: client.uuid });

    const submit = (event: React.FormEvent) => {
        event.preventDefault();

        // Le formulaire saisit des unités et des chaînes vides ; la base
        // attend des centimes et des null.
        form.transform((data) => ({
            ...data,
            offer: data.offer === '' ? null : data.offer,
            arrival_at: data.arrival_at === '' ? null : data.arrival_at,
            duration: data.duration === '' ? null : data.duration,
            furnished: data.furnished === '' ? null : data.furnished,
            budget_cents:
                data.budget.trim() === '' ? null : toCents(data.budget),
        }));

        form.patch(update({ lead: client.uuid }).url);
    };

    return (
        <>
            <Head title={`Modifier le dossier ${client.name}`} />
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-10">
                <div className="pt-8">
                    <h1 className="text-lg font-medium">
                        Modifier le dossier {client.name}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Les coordonnées du client et son projet de logement.
                        {client.reference && ` Dossier ${client.reference}.`}
                    </p>
                </div>

                <form
                    aria-label={`Modifier le dossier ${client.name}`}
                    className="grid gap-4"
                    onSubmit={submit}
                >
                    <FormSection
                        title="Coordonnées"
                        hint="Comment joindre le client, et la formule qu’il a prise."
                        icon={UserRound}
                    >
                        <FormGrid>
                            <Field
                                label="Prénom"
                                htmlFor="client-first-name"
                                error={errors.first_name}
                            >
                                <Input
                                    id="client-first-name"
                                    value={form.data.first_name}
                                    onChange={(event) =>
                                        form.setData(
                                            'first_name',
                                            event.target.value,
                                        )
                                    }
                                    aria-invalid={Boolean(errors.first_name)}
                                    autoComplete="off"
                                />
                            </Field>
                            <Field
                                label="Nom"
                                htmlFor="client-last-name"
                                error={errors.last_name}
                            >
                                <Input
                                    id="client-last-name"
                                    value={form.data.last_name}
                                    onChange={(event) =>
                                        form.setData(
                                            'last_name',
                                            event.target.value,
                                        )
                                    }
                                    aria-invalid={Boolean(errors.last_name)}
                                    autoComplete="off"
                                />
                            </Field>
                            <Field
                                label="E-mail"
                                htmlFor="client-email"
                                error={errors.email}
                            >
                                <Input
                                    id="client-email"
                                    type="email"
                                    value={form.data.email}
                                    onChange={(event) =>
                                        form.setData(
                                            'email',
                                            event.target.value,
                                        )
                                    }
                                    aria-invalid={Boolean(errors.email)}
                                    autoComplete="off"
                                />
                            </Field>
                            <Field
                                label="Téléphone"
                                htmlFor="client-phone"
                                error={errors.phone}
                            >
                                <PhoneInput
                                    id="client-phone"
                                    name="phone_national"
                                    value={form.data.phone}
                                    onChange={(value) =>
                                        form.setData('phone', value)
                                    }
                                />
                            </Field>
                            <Field
                                label="Société"
                                htmlFor="client-company"
                                error={errors.company}
                            >
                                <Input
                                    id="client-company"
                                    value={form.data.company}
                                    placeholder="Facultatif"
                                    onChange={(event) =>
                                        form.setData(
                                            'company',
                                            event.target.value,
                                        )
                                    }
                                    autoComplete="off"
                                />
                            </Field>
                            <Field label="Langue" error={errors.language}>
                                <ToggleGroup
                                    type="single"
                                    variant="outline"
                                    value={form.data.language}
                                    onValueChange={(value) =>
                                        value &&
                                        form.setData(
                                            'language',
                                            value as LeadLanguage,
                                        )
                                    }
                                    aria-label="Langue"
                                    className="justify-start"
                                >
                                    {languages.map((language) => (
                                        <ToggleGroupItem
                                            key={language.value}
                                            value={language.value}
                                            className="px-3"
                                        >
                                            <CountryFlag
                                                code={
                                                    language.value === 'en'
                                                        ? 'GB'
                                                        : 'FR'
                                                }
                                                className="size-3.5"
                                            />
                                            {language.label}
                                        </ToggleGroupItem>
                                    ))}
                                </ToggleGroup>
                            </Field>
                            <Field
                                label="Formule"
                                htmlFor="client-offer"
                                error={errors.offer}
                            >
                                <Select
                                    value={form.data.offer}
                                    onValueChange={(value) =>
                                        form.setData(
                                            'offer',
                                            value as OfferValue,
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="client-offer"
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="Aucune formule" />
                                    </SelectTrigger>
                                    <SelectContent>
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
                            </Field>
                        </FormGrid>
                    </FormSection>

                    <FormSection
                        title="Budget et calendrier"
                        hint="Ce que le client paie chaque mois, et quand il emménage."
                        icon={Wallet}
                    >
                        <FormGrid columns={3}>
                            <Field
                                label="Budget mensuel"
                                htmlFor="client-budget"
                                error={errors.budget_cents}
                            >
                                <Input
                                    id="client-budget"
                                    inputMode="decimal"
                                    placeholder="2500"
                                    className="tabular-nums"
                                    value={form.data.budget}
                                    onChange={(event) =>
                                        form.setData(
                                            'budget',
                                            event.target.value,
                                        )
                                    }
                                    aria-invalid={Boolean(errors.budget_cents)}
                                />
                            </Field>
                            <Field
                                label="Devise"
                                htmlFor="client-currency"
                                error={errors.currency}
                            >
                                <Select
                                    value={form.data.currency}
                                    onValueChange={(value) =>
                                        form.setData(
                                            'currency',
                                            value as Currency,
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="client-currency"
                                        className="w-full"
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
                                label="Emménagement"
                                htmlFor="client-arrival"
                                error={errors.arrival_at}
                            >
                                <DatePicker
                                    id="client-arrival"
                                    aria-label="Emménagement"
                                    value={form.data.arrival_at}
                                    onChange={(value) =>
                                        form.setData('arrival_at', value)
                                    }
                                />
                            </Field>
                        </FormGrid>
                    </FormSection>

                    <FormSection
                        title="Quartiers visés"
                        hint="Cliquez les arrondissements, ou tout Paris."
                        icon={MapPin}
                    >
                        <DistrictMap
                            value={form.data.districts}
                            onChange={(value) =>
                                form.setData('districts', value)
                            }
                        />
                        <InputError message={errors.districts} />
                    </FormSection>

                    <FormSection
                        title="Logement recherché"
                        hint="Le type de bien et les conditions du bail."
                        icon={House}
                    >
                        <Field
                            label="Type de bien"
                            htmlFor="client-property-types"
                            error={errors.property_types}
                        >
                            <ChoicePills
                                id="client-property-types"
                                label="Type de bien"
                                options={propertyTypes}
                                multiple
                                value={form.data.property_types}
                                onChange={(value) =>
                                    form.setData(
                                        'property_types',
                                        value as PropertyType[],
                                    )
                                }
                            />
                        </Field>
                        <ConditionChoices
                            durations={durations}
                            guarantors={guarantors}
                            furnishedOptions={furnishedOptions}
                            values={{
                                duration: form.data.duration,
                                guarantors: form.data.guarantors,
                                furnished: form.data.furnished,
                            }}
                            onChange={(key, value) =>
                                form.setData((data) => ({
                                    ...data,
                                    [key]: value,
                                }))
                            }
                            errors={{
                                duration: errors.duration,
                                guarantors: errors.guarantors,
                                furnished: errors.furnished,
                            }}
                        />
                    </FormSection>

                    <FormSection
                        title="Origine et note"
                        hint="D’où vient le client, et ce qu’il faut retenir du projet."
                        icon={NotebookPen}
                    >
                        <Field
                            label="Ville d’origine"
                            htmlFor="client-origin-city"
                            error={errors.origin_city}
                        >
                            {/* Une ville, pas une adresse : nos clients
                                arrivent du monde entier. */}
                            <AddressAutocomplete
                                id="client-origin-city"
                                kind="cities"
                                regionCodes={[]}
                                enabled={features.addressAutocomplete}
                                placeholder="Genève, Londres, New York…"
                                value={form.data.origin_city}
                                onChange={(value) =>
                                    form.setData('origin_city', value)
                                }
                                onSelect={(place) =>
                                    form.setData('origin_city', place.city)
                                }
                            />
                        </Field>
                        <Field
                            label="Note sur le projet"
                            htmlFor="client-message"
                            error={errors.message}
                        >
                            <Textarea
                                id="client-message"
                                rows={4}
                                placeholder="Besoins, contraintes, contexte…"
                                value={form.data.message}
                                onChange={(event) =>
                                    form.setData('message', event.target.value)
                                }
                            />
                        </Field>
                    </FormSection>

                    <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
                        <Button type="button" variant="ghost" asChild>
                            <Link href={dossier}>Annuler</Link>
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing && <Spinner />}
                            Enregistrer les modifications
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

ClientEdit.layout = {
    breadcrumbs: [
        { title: 'Clients', href: clientsIndex() },
        { title: 'Dossiers', href: clientsIndex() },
        { title: 'Modifier le dossier', href: '#' },
    ],
};
