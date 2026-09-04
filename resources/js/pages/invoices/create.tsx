import { Head, Link, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { AddressAutocomplete } from '@/components/address-autocomplete';
import { CountryFlag } from '@/components/country-flag';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
import { InvoicePreview } from '@/components/invoices/invoice-preview';
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
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { formatMoney } from '@/lib/format';
import { toCents, toNumber } from '@/lib/invoice-totals';
import { index as invoicesIndex, store } from '@/routes/invoices';
import type {
    Company,
    CountryOption,
    Currency,
    InvoiceForm,
    InvoiceLineForm,
    Offer,
    OfferValue,
} from '@/types';

type Props = {
    company: Company;
    offers: Offer[];
    currencies: { value: Currency; label: string }[];
    vatRates: { value: number; label: string }[];
    countries: CountryOption[];
    defaults: {
        currency: Currency;
        vat_rate: number;
        issued_at: string;
        due_at: string;
    };
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
    offers,
    currencies,
    vatRates,
    countries,
    defaults,
}: Props) {
    const firstOffer = offers[0]?.value ?? 'accompagne';
    const emptyLine = (currency: Currency): InvoiceLineForm => ({
        offer: firstOffer,
        quantity: '1',
        unit_price: defaultPrice(offers, firstOffer, currency),
    });

    const form = useForm<InvoiceForm>({
        client_name: '',
        client_email: '',
        client_street: '',
        client_postal_code: '',
        client_city: '',
        client_country: countries[0]?.name ?? '',
        currency: defaults.currency,
        vat_rate: String(defaults.vat_rate),
        issued_at: defaults.issued_at,
        due_at: defaults.due_at,
        notes: '',
        items: [emptyLine(defaults.currency)],
    });

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

    // Changer de devise recalcule les prix par défaut de toutes les lignes.
    const setCurrency = (currency: Currency) =>
        form.setData({
            ...form.data,
            currency,
            items: form.data.items.map((line) => ({
                ...line,
                unit_price: defaultPrice(offers, line.offer, currency),
            })),
        });

    const addLine = () =>
        form.setData('items', [
            ...form.data.items,
            emptyLine(form.data.currency),
        ]);

    const removeLine = (index: number) =>
        form.setData(
            'items',
            form.data.items.filter((_, i) => i !== index),
        );

    const submit = (event: FormEvent) => {
        event.preventDefault();

        // Le backend attend des centimes et des nombres.
        form.transform((data) => ({
            ...data,
            vat_rate: toNumber(data.vat_rate),
            items: data.items.map((line) => ({
                offer: line.offer,
                quantity: toNumber(line.quantity),
                unit_price_cents: toCents(line.unit_price),
            })),
        }));
        form.post(store().url);
    };

    const lineError = (
        index: number,
        field: 'offer' | 'quantity' | 'unit_price',
    ) =>
        (form.errors as Record<string, string>)[
            `items.${index}.${field === 'unit_price' ? 'unit_price_cents' : field}`
        ];

    return (
        <>
            <Head title="Nouvelle facture" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4">
                <div className="flex items-end justify-between pt-8 pb-6">
                    <div>
                        <h1 className="text-lg font-medium">
                            Nouvelle facture
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            L'aperçu se met à jour au fur et à mesure.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
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
                    </div>
                </div>

                <div className="grid gap-8 pb-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <form
                        id="invoice-form"
                        onSubmit={submit}
                        className="grid gap-8"
                        data-test="invoice-form"
                    >
                        <section className="grid gap-5">
                            <h2 className="text-base font-medium">Client</h2>
                            <div className="grid gap-5 sm:grid-cols-2">
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
                                    <InputError
                                        message={form.errors.client_name}
                                    />
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
                                    <InputError
                                        message={form.errors.client_email}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="client_street">Adresse</Label>
                                <AddressAutocomplete
                                    id="client_street"
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
                                <InputError
                                    message={form.errors.client_street}
                                />
                            </div>
                            <div className="grid gap-5 sm:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)]">
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
                                        message={form.errors.client_postal_code}
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
                                    <InputError
                                        message={form.errors.client_city}
                                    />
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
                                        message={form.errors.client_country}
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="grid gap-5">
                            <h2 className="text-base font-medium">
                                Conditions
                            </h2>
                            <div className="grid gap-5 sm:grid-cols-2">
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
                                    <InputError
                                        message={form.errors.currency}
                                    />
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
                                    <InputError
                                        message={form.errors.vat_rate}
                                    />
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
                                    <InputError
                                        message={form.errors.issued_at}
                                    />
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
                                    <InputError message={form.errors.due_at} />
                                </div>
                            </div>
                        </section>

                        <section className="grid gap-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-base font-medium">
                                        Lignes
                                    </h2>
                                    <p className="text-muted-foreground text-sm">
                                        Une ligne par offre facturée.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addLine}
                                >
                                    <Plus />
                                    Ajouter une ligne
                                </Button>
                            </div>
                            <InputError message={form.errors.items} />
                            <ol role="list" className="grid gap-4">
                                {form.data.items.map((line, index) => {
                                    const lineTotal = Math.round(
                                        toNumber(line.quantity) *
                                            toCents(line.unit_price),
                                    );

                                    return (
                                        <li
                                            key={index}
                                            className="bg-background grid gap-5 rounded-lg border p-5"
                                            data-test="invoice-line"
                                        >
                                            <div className="flex items-center justify-between">
                                                <p className="text-muted-foreground text-xs font-medium uppercase">
                                                    Ligne {index + 1}
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

                                            <RadioGroup
                                                aria-label={`Offre ligne ${index + 1}`}
                                                value={line.offer}
                                                onValueChange={(value) =>
                                                    setOffer(
                                                        index,
                                                        value as OfferValue,
                                                    )
                                                }
                                                className="grid gap-3 sm:grid-cols-2"
                                            >
                                                {offers.map((offer) => (
                                                    <Label
                                                        key={offer.value}
                                                        htmlFor={`line-${index}-${offer.value}`}
                                                        className="bg-muted/40 has-data-[state=checked]:border-primary has-data-[state=checked]:ring-primary/20 hover:bg-accent/40 flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal transition-colors has-data-[state=checked]:ring-2"
                                                    >
                                                        <RadioGroupItem
                                                            id={`line-${index}-${offer.value}`}
                                                            value={offer.value}
                                                            className="mt-0.5"
                                                        />
                                                        <span className="grid gap-0.5">
                                                            <span className="font-medium">
                                                                {offer.label}
                                                            </span>
                                                            <span className="text-muted-foreground text-xs">
                                                                {formatMoney(
                                                                    offer
                                                                        .prices[
                                                                        form
                                                                            .data
                                                                            .currency
                                                                    ],
                                                                    form.data
                                                                        .currency,
                                                                )}{' '}
                                                                par défaut
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

                                            <div className="grid gap-3 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:items-end">
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
                        </section>

                        <section className="grid gap-2">
                            <Label htmlFor="notes">
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
                            <InputError message={form.errors.notes} />
                        </section>
                    </form>

                    <aside className="bg-sidebar rounded-xl border p-2 lg:sticky lg:top-4 lg:self-start">
                        <InvoicePreview
                            form={form.data}
                            company={company}
                            offers={offers}
                        />
                    </aside>
                </div>
            </div>
        </>
    );
}

InvoicesCreate.layout = {
    breadcrumbs: [
        { title: 'Leads', href: '#' },
        { title: 'Factures', href: invoicesIndex() },
        { title: 'Nouvelle facture', href: '#' },
    ],
};
