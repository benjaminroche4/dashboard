import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    ChevronDown,
    FileText,
    ListPlus,
    Landmark,
    MessageSquareText,
    PencilLine,
    Percent,
    Plus,
    Tag,
    Trash2,
    UserRound,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { AddressAutocomplete } from '@/components/address-autocomplete';
import { CountryFlag } from '@/components/country-flag';
import { DatePicker } from '@/components/date-picker';
import { FormActionBar } from '@/components/form-action-bar';
import { FormSection } from '@/components/form-section';
import InputError from '@/components/input-error';
import { CreateFromMenu } from '@/components/invoices/create-from-menu';
import { BankAccountField } from '@/components/invoices/bank-account-field';
import { InvoicePreview } from '@/components/invoices/invoice-preview';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { formatMoney } from '@/lib/format';
import { invoiceToForm } from '@/lib/invoice-to-form';
import { notify } from '@/lib/toast';
import {
    toCents,
    toNumber,
    validateInvoiceForm,
    type InvoiceFormErrors,
} from '@/lib/invoice-totals';
import {
    create as invoicesCreate,
    index as invoicesIndex,
    store,
    update,
} from '@/routes/invoices';
import { show as leadShow } from '@/routes/leads';
import { index as toolsIndex } from '@/routes/tools';
import type {
    BankAccountOption,
    Company,
    CountryOption,
    Currency,
    InvoiceDetail,
    InvoiceForm,
    InvoiceLineForm,
    InvoicePrefill,
    Offer,
    OfferValue,
} from '@/types';

type Props = {
    company: Company;
    bankAccounts: BankAccountOption[];
    offers: Offer[];
    currencies: { value: Currency; label: string }[];
    vatRates: { value: number; label: string }[];
    countries: CountryOption[];
    /** Numéro que recevra la facture à sa création (affiché dans l'aperçu). */
    nextNumber: string;
    defaults: {
        currency: Currency;
        vat_rate: number;
        issued_at: string;
        due_at: string;
    };
    /** Création depuis une fiche lead (?lead=ID) : client prérempli, facture rattachée. */
    prefill?: InvoicePrefill | null;
    /** Brouillon à modifier : la page devient « Modifier la facture ». */
    invoice?: InvoiceDetail | null;
};

/** Nom du pays de la liste à partir du code ISO renvoyé par Google, sinon « Autre ». */
function countryNameFor(
    countries: CountryOption[],
    code: string | null,
): string {
    const match = countries.find(
        (country) => country.code !== null && country.code === code,
    );

    return (
        match?.name ??
        countries.find((country) => country.code === null)?.name ??
        ''
    );
}

/** Prix par défaut d'une offre dans la devise, en unités (« 2500 »). */
function defaultPrice(
    offers: Offer[],
    offer: OfferValue,
    currency: Currency,
): string {
    const cents =
        offers.find((candidate) => candidate.value === offer)?.prices[
            currency
        ] ?? 0;

    return cents > 0 ? String(cents / 100) : '';
}

export default function InvoicesCreate({
    company,
    bankAccounts,
    offers,
    currencies,
    vatRates,
    countries,
    nextNumber,
    defaults,
    prefill = null,
    invoice = null,
}: Props) {
    const { features } = usePage().props;
    const firstOffer = offers[0]?.value ?? 'accompagne';
    const emptyLine = (currency: Currency): InvoiceLineForm => ({
        offer: firstOffer,
        description: '',
        quantity: '1',
        unit_price: defaultPrice(offers, firstOffer, currency),
    });
    // Ligne libre : libellé saisi, prix à renseigner.
    const freeLine = (): InvoiceLineForm => ({
        offer: null,
        description: '',
        quantity: '1',
        unit_price: '',
    });

    const initialCurrency = prefill?.currency ?? defaults.currency;
    const initialOffer = prefill?.offer ?? firstOffer;
    const editing = invoice ?? null;
    const form = useForm<InvoiceForm>(
        editing
            ? invoiceToForm(editing)
            : {
                  client_name: prefill?.client_name ?? '',
                  client_email: prefill?.client_email ?? '',
                  client_street: '',
                  client_postal_code: '',
                  client_city: '',
                  client_country: countries[0]?.name ?? '',
                  currency: initialCurrency,
                  vat_rate: String(defaults.vat_rate),
                  discount_percent: '',
                  deposit: '',
                  issued_at: defaults.issued_at,
                  due_at: defaults.due_at,
                  notes: '',
                  bank_name: '',
                  bank_iban: '',
                  items: [
                      {
                          offer: initialOffer,
                          description: '',
                          quantity: '1',
                          unit_price: defaultPrice(
                              offers,
                              initialOffer,
                              initialCurrency,
                          ),
                      },
                  ],
              },
    );

    // Erreurs détectées localement avant l'envoi ; celles du serveur priment.
    const [localErrors, setLocalErrors] = useState<InvoiceFormErrors>({});
    const errors: Record<string, string | undefined> = {
        ...localErrors,
        ...(form.errors as Record<string, string>),
    };

    const setLine = (index: number, patch: Partial<InvoiceLineForm>) =>
        form.setData(
            'items',
            form.data.items.map((line, i) =>
                i === index ? { ...line, ...patch } : line,
            ),
        );

    // Changer l'offre d'une ligne remplit son prix par défaut dans la devise courante.
    const setOffer = (index: number, offer: OfferValue) =>
        setLine(index, {
            offer,
            unit_price: defaultPrice(offers, offer, form.data.currency),
        });

    // Changer de devise recalcule les prix par défaut des lignes d'offre ;
    // les lignes libres gardent leur prix saisi.
    const setCurrency = (currency: Currency) =>
        form.setData({
            ...form.data,
            currency,
            items: form.data.items.map((line) =>
                line.offer === null
                    ? line
                    : {
                          ...line,
                          unit_price: defaultPrice(
                              offers,
                              line.offer,
                              currency,
                          ),
                      },
            ),
        });

    const addLine = (kind: 'offer' | 'free') =>
        form.setData('items', [
            ...form.data.items,
            kind === 'offer' ? emptyLine(form.data.currency) : freeLine(),
        ]);

    const removeLine = (index: number) =>
        form.setData(
            'items',
            form.data.items.filter((_, i) => i !== index),
        );

    const submit = (event: FormEvent) => {
        event.preventDefault();

        // Validation locale : pas d'aller-retour serveur pour les oublis évidents.
        const found = validateInvoiceForm(form.data);
        setLocalErrors(found);

        if (Object.keys(found).length > 0) {
            notify.error(
                'Formulaire incomplet',
                'Corrigez les champs signalés avant de créer la facture.',
            );

            return;
        }

        // Le backend attend des centimes et des nombres.
        form.transform((data) => ({
            ...data,
            lead_id: editing?.lead?.id ?? prefill?.lead_id ?? null,
            vat_rate: toNumber(data.vat_rate),
            discount_percent: toNumber(data.discount_percent || 0),
            deposit_cents: toCents(data.deposit || 0),
            items: data.items.map((line) => ({
                offer: line.offer,
                description:
                    line.offer === null ? line.description.trim() : null,
                quantity: toNumber(line.quantity),
                unit_price_cents: toCents(line.unit_price),
            })),
        }));
        if (editing) {
            form.put(update({ invoice: editing.uuid }).url);

            return;
        }

        form.post(store().url);
    };

    const lineError = (
        index: number,
        field: 'offer' | 'description' | 'quantity' | 'unit_price',
    ) =>
        errors[
            `items.${index}.${field === 'unit_price' ? 'unit_price_cents' : field}`
        ];

    return (
        <>
            <Head title="Nouvelle facture" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4">
                <div className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-6">
                    <div>
                        <h1 className="text-lg font-medium">
                            Nouvelle facture
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            {prefill ? (
                                <>
                                    Pour le lead{' '}
                                    <Link
                                        href={leadShow({
                                            lead: prefill.lead_uuid,
                                        })}
                                        className="text-foreground font-medium underline-offset-4 hover:underline"
                                    >
                                        {prefill.lead_name}
                                    </Link>
                                    , la facture lui sera rattachée.
                                </>
                            ) : (
                                "L'aperçu se met à jour au fur et à mesure."
                            )}
                        </p>
                    </div>
                    <CreateFromMenu
                        kind="invoice"
                        createUrl={invoicesCreate().url}
                    />
                </div>

                <div className="grid grid-cols-1 gap-8 pb-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <form
                        id="invoice-form"
                        onSubmit={submit}
                        className="grid gap-8"
                        data-test="invoice-form"
                    >
                        <FormSection
                            title="Client"
                            hint="Le destinataire de la facture."
                            icon={UserRound}
                        >
                            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="client_name">
                                        Nom / Prénom
                                    </Label>
                                    <Input
                                        id="client_name"
                                        name="client_name"
                                        className="bg-background"
                                        value={form.data.client_name}
                                        onChange={(e) =>
                                            form.setData(
                                                'client_name',
                                                e.target.value,
                                            )
                                        }
                                        required
                                        autoFocus
                                    />
                                    <InputError message={errors.client_name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="client_email">E-mail</Label>
                                    <Input
                                        id="client_email"
                                        name="client_email"
                                        className="bg-background"
                                        type="email"
                                        value={form.data.client_email}
                                        onChange={(e) =>
                                            form.setData(
                                                'client_email',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    <InputError message={errors.client_email} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="client_street">Adresse</Label>
                                <AddressAutocomplete
                                    id="client_street"
                                    enabled={features.addressAutocomplete}
                                    value={form.data.client_street}
                                    onChange={(street) =>
                                        form.setData('client_street', street)
                                    }
                                    onSelect={(address) =>
                                        form.setData({
                                            ...form.data,
                                            client_street: address.street,
                                            client_postal_code:
                                                address.postalCode,
                                            client_city: address.city,
                                            client_country: countryNameFor(
                                                countries,
                                                address.countryCode,
                                            ),
                                        })
                                    }
                                />
                                <InputError message={errors.client_street} />
                            </div>
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)]">
                                <div className="grid gap-2">
                                    <Label htmlFor="client_postal_code">
                                        Code postal
                                    </Label>
                                    <Input
                                        id="client_postal_code"
                                        name="client_postal_code"
                                        className="bg-background"
                                        autoComplete="postal-code"
                                        value={form.data.client_postal_code}
                                        onChange={(e) =>
                                            form.setData(
                                                'client_postal_code',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={errors.client_postal_code}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="client_city">Ville</Label>
                                    <Input
                                        id="client_city"
                                        name="client_city"
                                        className="bg-background"
                                        autoComplete="address-level2"
                                        value={form.data.client_city}
                                        onChange={(e) =>
                                            form.setData(
                                                'client_city',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    <InputError message={errors.client_city} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="client_country">Pays</Label>
                                    <Select
                                        value={form.data.client_country}
                                        onValueChange={(value) =>
                                            form.setData(
                                                'client_country',
                                                value,
                                            )
                                        }
                                    >
                                        <SelectTrigger
                                            id="client_country"
                                            className="bg-background w-full"
                                        >
                                            <SelectValue placeholder="Pays" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {countries.map((country) => (
                                                <SelectItem
                                                    key={country.name}
                                                    value={country.name}
                                                >
                                                    <CountryFlag
                                                        code={country.code}
                                                    />
                                                    {country.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError
                                        message={errors.client_country}
                                    />
                                </div>
                            </div>
                        </FormSection>

                        <FormSection
                            title="Conditions"
                            hint="Devise, dates et TVA appliquée."
                            icon={FileText}
                        >
                            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="currency">Devise</Label>
                                    <Select
                                        value={form.data.currency}
                                        onValueChange={(value) =>
                                            setCurrency(value as Currency)
                                        }
                                    >
                                        <SelectTrigger
                                            id="currency"
                                            className="bg-background w-full"
                                        >
                                            <SelectValue placeholder="Devise" />
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
                                    <InputError message={errors.currency} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="vat_rate">TVA</Label>
                                    <Select
                                        value={form.data.vat_rate}
                                        onValueChange={(value) =>
                                            form.setData('vat_rate', value)
                                        }
                                    >
                                        <SelectTrigger
                                            id="vat_rate"
                                            className="bg-background w-full"
                                        >
                                            <SelectValue placeholder="Taux de TVA" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {vatRates.map((rate) => (
                                                <SelectItem
                                                    key={rate.value}
                                                    value={String(rate.value)}
                                                >
                                                    {rate.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.vat_rate} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="issued_at">
                                        Date d'émission
                                    </Label>
                                    <DatePicker
                                        id="issued_at"
                                        aria-label="Date d'émission"
                                        value={form.data.issued_at}
                                        onChange={(iso) =>
                                            form.setData('issued_at', iso)
                                        }
                                    />
                                    <InputError message={errors.issued_at} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="due_at">Échéance</Label>
                                    <DatePicker
                                        id="due_at"
                                        aria-label="Échéance"
                                        value={form.data.due_at}
                                        onChange={(iso) =>
                                            form.setData('due_at', iso)
                                        }
                                    />
                                    <InputError message={errors.due_at} />
                                </div>
                            </div>
                        </FormSection>

                        <FormSection
                            title="Lignes"
                            hint="Une ligne par offre ou prestation facturée."
                            icon={ListPlus}
                            action={
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                        >
                                            <Plus />
                                            Ajouter une ligne
                                            <ChevronDown className="opacity-60" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            onClick={() => addLine('offer')}
                                        >
                                            <Tag />
                                            Offre
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => addLine('free')}
                                        >
                                            <PencilLine />
                                            Ligne libre
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            }
                        >
                            <InputError message={errors.items} />
                            <ol role="list" className="grid gap-4">
                                {form.data.items.map((line, index) => {
                                    const lineTotal = Math.round(
                                        toNumber(line.quantity) *
                                            toCents(line.unit_price),
                                    );

                                    return (
                                        <li
                                            key={index}
                                            className="bg-sidebar grid gap-4 rounded-lg border p-4"
                                            data-test="invoice-line"
                                        >
                                            <div className="flex items-center justify-between">
                                                <p className="text-muted-foreground text-xs font-medium uppercase">
                                                    Ligne {index + 1}
                                                    {line.offer === null &&
                                                        ' · Libre'}
                                                </p>
                                                {form.data.items.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground hover:text-destructive size-7"
                                                        aria-label={`Supprimer la ligne ${index + 1}`}
                                                        onClick={() =>
                                                            removeLine(index)
                                                        }
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                )}
                                            </div>

                                            {line.offer === null ? (
                                                <div className="grid gap-1.5">
                                                    <Label
                                                        htmlFor={`line-${index}-description`}
                                                    >
                                                        Libellé
                                                    </Label>
                                                    <Input
                                                        id={`line-${index}-description`}
                                                        aria-label={`Libellé ligne ${index + 1}`}
                                                        className="bg-background"
                                                        placeholder="Ex. État des lieux d'entrée"
                                                        maxLength={255}
                                                        value={line.description}
                                                        onChange={(e) =>
                                                            setLine(index, {
                                                                description:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                    />
                                                    <InputError
                                                        message={lineError(
                                                            index,
                                                            'description',
                                                        )}
                                                    />
                                                </div>
                                            ) : (
                                                <>
                                                    <RadioGroup
                                                        aria-label={`Offre ligne ${index + 1}`}
                                                        value={line.offer}
                                                        onValueChange={(
                                                            value,
                                                        ) =>
                                                            setOffer(
                                                                index,
                                                                value as OfferValue,
                                                            )
                                                        }
                                                        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                                                    >
                                                        {offers.map((offer) => (
                                                            <Label
                                                                key={
                                                                    offer.value
                                                                }
                                                                htmlFor={`line-${index}-${offer.value}`}
                                                                className="bg-muted/40 has-data-[state=checked]:border-primary has-data-[state=checked]:ring-primary/20 hover:bg-accent/40 flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal transition-colors has-data-[state=checked]:ring-2"
                                                            >
                                                                <RadioGroupItem
                                                                    id={`line-${index}-${offer.value}`}
                                                                    value={
                                                                        offer.value
                                                                    }
                                                                    className="mt-0.5"
                                                                />
                                                                <span className="grid gap-0.5">
                                                                    <span className="font-medium">
                                                                        {
                                                                            offer.label
                                                                        }
                                                                    </span>
                                                                    <span className="text-muted-foreground text-xs">
                                                                        {formatMoney(
                                                                            offer
                                                                                .prices
                                                                                .EUR,
                                                                            'EUR',
                                                                        )}
                                                                    </span>
                                                                </span>
                                                            </Label>
                                                        ))}
                                                    </RadioGroup>
                                                    <InputError
                                                        message={lineError(
                                                            index,
                                                            'offer',
                                                        )}
                                                    />
                                                </>
                                            )}

                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:items-end">
                                                <div className="grid gap-1.5">
                                                    <Label
                                                        htmlFor={`line-${index}-quantity`}
                                                    >
                                                        Quantité
                                                    </Label>
                                                    <Input
                                                        id={`line-${index}-quantity`}
                                                        aria-label={`Quantité ligne ${index + 1}`}
                                                        inputMode="decimal"
                                                        className="bg-background"
                                                        value={line.quantity}
                                                        onChange={(e) =>
                                                            setLine(index, {
                                                                quantity:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                    />
                                                    <InputError
                                                        message={lineError(
                                                            index,
                                                            'quantity',
                                                        )}
                                                    />
                                                </div>
                                                <div className="grid gap-1.5">
                                                    <Label
                                                        htmlFor={`line-${index}-price`}
                                                    >
                                                        Prix unitaire (
                                                        {form.data.currency})
                                                    </Label>
                                                    <Input
                                                        id={`line-${index}-price`}
                                                        aria-label={`Prix unitaire ligne ${index + 1}`}
                                                        inputMode="decimal"
                                                        className="bg-background"
                                                        placeholder="0.00"
                                                        value={line.unit_price}
                                                        onChange={(e) =>
                                                            setLine(index, {
                                                                unit_price:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                    />
                                                    <InputError
                                                        message={lineError(
                                                            index,
                                                            'unit_price',
                                                        )}
                                                    />
                                                </div>
                                                <div className="grid gap-1.5 text-right">
                                                    <span className="text-muted-foreground text-sm">
                                                        Total ligne
                                                    </span>
                                                    <span
                                                        className="h-9 leading-9 font-medium tabular-nums"
                                                        data-test="line-total"
                                                    >
                                                        {formatMoney(
                                                            lineTotal,
                                                            form.data.currency,
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
                        </FormSection>

                        <FormSection
                            title="Remise et acompte"
                            hint="Facultatif. La remise s'applique avant la TVA, l'acompte est déduit du total."
                            icon={Percent}
                        >
                            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="discount_percent">
                                        Remise (%)
                                    </Label>
                                    <Input
                                        id="discount_percent"
                                        name="discount_percent"
                                        inputMode="decimal"
                                        className="bg-background"
                                        placeholder="0"
                                        value={form.data.discount_percent}
                                        onChange={(e) =>
                                            form.setData(
                                                'discount_percent',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={errors.discount_percent}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="deposit">
                                        Acompte déjà versé ({form.data.currency}
                                        )
                                    </Label>
                                    <Input
                                        id="deposit"
                                        name="deposit"
                                        inputMode="decimal"
                                        className="bg-background"
                                        placeholder="0.00"
                                        value={form.data.deposit}
                                        onChange={(e) =>
                                            form.setData(
                                                'deposit',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={errors.deposit_cents}
                                    />
                                </div>
                            </div>
                        </FormSection>

                        <FormSection
                            title="Règlement"
                            hint="Le compte sur lequel le client vire le montant."
                            icon={Landmark}
                        >
                            <BankAccountField
                                accounts={bankAccounts}
                                currency={form.data.currency}
                                bankName={form.data.bank_name}
                                bankIban={form.data.bank_iban}
                                errors={{
                                    bank_name: errors.bank_name,
                                    bank_iban: errors.bank_iban,
                                }}
                                onChange={(values) => form.setData(values)}
                            />
                        </FormSection>

                        <FormSection
                            title="Notes"
                            hint="Affichées en bas de la facture."
                            icon={MessageSquareText}
                        >
                            <Label htmlFor="notes" className="sr-only">
                                Notes (affichées sur la facture)
                            </Label>
                            <Textarea
                                id="notes"
                                name="notes"
                                className="bg-background"
                                rows={3}
                                value={form.data.notes}
                                onChange={(e) =>
                                    form.setData('notes', e.target.value)
                                }
                            />
                            <InputError message={errors.notes} />
                        </FormSection>
                    </form>

                    <aside className="bg-sidebar rounded-xl border p-2 lg:sticky lg:top-4 lg:self-start">
                        <InvoicePreview
                            form={form.data}
                            company={company}
                            offers={offers}
                            number={nextNumber}
                        />
                    </aside>
                </div>
            </div>
            <FormActionBar>
                <Button type="button" variant="ghost" asChild>
                    <Link href={invoicesIndex()}>Annuler</Link>
                </Button>
                <Button
                    type="submit"
                    form="invoice-form"
                    disabled={form.processing}
                    data-test="invoice-submit"
                >
                    {form.processing && <Spinner />}
                    Créer la facture
                </Button>
            </FormActionBar>
        </>
    );
}

InvoicesCreate.layout = {
    breadcrumbs: [
        { title: 'Outils', href: toolsIndex() },
        { title: 'Factures', href: invoicesIndex() },
        { title: 'Nouvelle facture', href: '#' },
    ],
};
