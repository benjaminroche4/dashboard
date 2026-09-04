import { Head, Link, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
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
    defaults: {
        currency: Currency;
        vat_rate: number;
        issued_at: string;
        due_at: string;
    };
};

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
        client_address: '',
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
            <div className="mx-auto grid w-full max-w-7xl gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <form
                    onSubmit={submit}
                    className="flex flex-col gap-8"
                    data-test="invoice-form"
                >
                    <section className="grid gap-4">
                        <h2 className="text-base font-medium">Client</h2>
                        <div className="grid gap-2">
                            <Label htmlFor="client_name">Nom</Label>
                            <Input
                                id="client_name"
                                name="client_name"
                                value={form.data.client_name}
                                onChange={(e) =>
                                    form.setData('client_name', e.target.value)
                                }
                                required
                                autoFocus
                            />
                            <InputError message={form.errors.client_name} />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="client_email">E-mail</Label>
                                <Input
                                    id="client_email"
                                    name="client_email"
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
                            <div className="grid gap-2">
                                <Label htmlFor="client_address">Adresse</Label>
                                <Textarea
                                    id="client_address"
                                    name="client_address"
                                    rows={3}
                                    value={form.data.client_address}
                                    onChange={(e) =>
                                        form.setData(
                                            'client_address',
                                            e.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={form.errors.client_address}
                                />
                            </div>
                        </div>
                    </section>

                    <section className="grid gap-4">
                        <h2 className="text-base font-medium">Conditions</h2>
                        <div className="grid gap-4 sm:grid-cols-2">
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
                                        className="w-full"
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
                                <InputError message={form.errors.currency} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="vat_rate">TVA (%)</Label>
                                <Input
                                    id="vat_rate"
                                    name="vat_rate"
                                    inputMode="decimal"
                                    value={form.data.vat_rate}
                                    onChange={(e) =>
                                        form.setData('vat_rate', e.target.value)
                                    }
                                />
                                <InputError message={form.errors.vat_rate} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="issued_at">
                                    Date d'émission
                                </Label>
                                <Input
                                    id="issued_at"
                                    name="issued_at"
                                    type="date"
                                    value={form.data.issued_at}
                                    onChange={(e) =>
                                        form.setData(
                                            'issued_at',
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                                <InputError message={form.errors.issued_at} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="due_at">Échéance</Label>
                                <Input
                                    id="due_at"
                                    name="due_at"
                                    type="date"
                                    value={form.data.due_at}
                                    onChange={(e) =>
                                        form.setData('due_at', e.target.value)
                                    }
                                    required
                                />
                                <InputError message={form.errors.due_at} />
                            </div>
                        </div>
                    </section>

                    <section className="grid gap-4">
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
                        <ol role="list" className="grid gap-3">
                            {form.data.items.map((line, index) => {
                                const lineTotal = Math.round(
                                    toNumber(line.quantity) *
                                        toCents(line.unit_price),
                                );

                                return (
                                    <li
                                        key={index}
                                        className="bg-sidebar grid gap-4 rounded-xl border p-4"
                                        data-test="invoice-line"
                                    >
                                        <div className="flex items-center justify-between">
                                            <p className="text-muted-foreground text-xs font-medium uppercase">
                                                Ligne {index + 1}
                                            </p>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="text-muted-foreground hover:text-destructive size-7"
                                                aria-label={`Supprimer la ligne ${index + 1}`}
                                                onClick={() =>
                                                    removeLine(index)
                                                }
                                                disabled={
                                                    form.data.items.length === 1
                                                }
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
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
                                                    className="bg-background has-data-[state=checked]:border-primary has-data-[state=checked]:ring-primary/20 hover:bg-accent/40 flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal transition-colors has-data-[state=checked]:ring-2"
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
                                                                offer.prices[
                                                                    form.data
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
                                            message={lineError(index, 'offer')}
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
                                                                e.target.value,
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
                                                                e.target.value,
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
                            rows={3}
                            value={form.data.notes}
                            onChange={(e) =>
                                form.setData('notes', e.target.value)
                            }
                        />
                        <InputError message={form.errors.notes} />
                    </section>

                    <div className="flex items-center justify-end gap-2">
                        <Button type="button" variant="ghost" asChild>
                            <Link href={invoicesIndex()}>Annuler</Link>
                        </Button>
                        <Button
                            type="submit"
                            disabled={form.processing}
                            data-test="invoice-submit"
                        >
                            {form.processing && <Spinner />}
                            Créer la facture
                        </Button>
                    </div>
                </form>

                <aside className="lg:sticky lg:top-4 lg:self-start">
                    <InvoicePreview
                        form={form.data}
                        company={company}
                        offers={offers}
                    />
                </aside>
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
