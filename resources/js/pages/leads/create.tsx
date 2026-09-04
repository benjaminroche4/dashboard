import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
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
import { toCents } from '@/lib/invoice-totals';
import { index as leadsIndex, store } from '@/routes/leads';
import type { Currency, LeadForm, LeadSource, OfferValue } from '@/types';

type Props = {
    offers: { value: OfferValue; label: string; description: string }[];
    sources: { value: LeadSource; label: string }[];
    currencies: { value: Currency; label: string }[];
    defaultCurrency: Currency;
};

/**
 * Converting Machine : le formulaire de qualification d'un prospect.
 */
export default function LeadsCreate({
    offers,
    sources,
    currencies,
    defaultCurrency,
}: Props) {
    const form = useForm<LeadForm>({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        offer: '',
        arrival_at: '',
        budget: '',
        currency: defaultCurrency,
        origin_city: '',
        source: sources[0]?.value ?? 'website',
        message: '',
    });
    const errors = form.errors as Record<string, string | undefined>;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.transform((data) => ({
            ...data,
            offer: data.offer === '' ? null : data.offer,
            arrival_at: data.arrival_at === '' ? null : data.arrival_at,
            budget_cents:
                data.budget.trim() === '' ? null : toCents(data.budget),
        }));
        form.post(store().url);
    };

    return (
        <>
            <Head title="Converting Machine" />
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-10">
                <div className="flex items-end justify-between pt-8 pb-6">
                    <div>
                        <h1 className="text-lg font-medium">
                            Converting Machine
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Qualifiez un prospect en quelques champs, il rejoint
                            le kanban des leads dans « À traiter ».
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button type="button" variant="ghost" asChild>
                            <Link href={leadsIndex()}>Annuler</Link>
                        </Button>
                        <Button
                            type="submit"
                            form="lead-form"
                            disabled={form.processing}
                        >
                            {form.processing && <Spinner />}
                            Ajouter le lead
                        </Button>
                    </div>
                </div>

                <form
                    id="lead-form"
                    onSubmit={submit}
                    className="grid gap-8"
                    data-test="lead-form"
                >
                    <section className="grid gap-5">
                        <div>
                            <h2 className="text-base font-medium">Contact</h2>
                            <p className="text-muted-foreground text-sm">
                                Un e-mail ou un téléphone suffit.
                            </p>
                        </div>
                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="first_name">Prénom</Label>
                                <Input
                                    id="first_name"
                                    name="first_name"
                                    required
                                    autoFocus
                                    autoComplete="off"
                                    className="bg-background"
                                    value={form.data.first_name}
                                    onChange={(e) =>
                                        form.setData(
                                            'first_name',
                                            e.target.value,
                                        )
                                    }
                                />
                                <InputError message={errors.first_name} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="last_name">Nom</Label>
                                <Input
                                    id="last_name"
                                    name="last_name"
                                    required
                                    autoComplete="off"
                                    className="bg-background"
                                    value={form.data.last_name}
                                    onChange={(e) =>
                                        form.setData(
                                            'last_name',
                                            e.target.value,
                                        )
                                    }
                                />
                                <InputError message={errors.last_name} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">E-mail</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="off"
                                    className="bg-background"
                                    value={form.data.email}
                                    onChange={(e) =>
                                        form.setData('email', e.target.value)
                                    }
                                />
                                <InputError message={errors.email} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Téléphone</Label>
                                <Input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    autoComplete="off"
                                    className="bg-background"
                                    value={form.data.phone}
                                    onChange={(e) =>
                                        form.setData('phone', e.target.value)
                                    }
                                />
                                <InputError message={errors.phone} />
                            </div>
                        </div>
                    </section>

                    <Separator />

                    <section className="grid gap-5">
                        <div>
                            <h2 className="text-base font-medium">Projet</h2>
                            <p className="text-muted-foreground text-sm">
                                Ce que le prospect cherche à Paris.
                            </p>
                        </div>
                        <div className="grid gap-2">
                            <Label>Offre visée</Label>
                            <RadioGroup
                                value={form.data.offer}
                                onValueChange={(value) =>
                                    form.setData('offer', value as OfferValue)
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
                            <InputError message={errors.offer} />
                        </div>
                        <div className="grid gap-5 sm:grid-cols-3">
                            <div className="grid gap-2">
                                <Label htmlFor="arrival_at">
                                    Date d'arrivée
                                </Label>
                                <DatePicker
                                    id="arrival_at"
                                    aria-label="Date d'arrivée"
                                    value={form.data.arrival_at}
                                    onChange={(value) =>
                                        form.setData('arrival_at', value)
                                    }
                                />
                                <InputError message={errors.arrival_at} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="budget">Budget mensuel</Label>
                                <Input
                                    id="budget"
                                    name="budget"
                                    inputMode="decimal"
                                    placeholder="2500"
                                    className="bg-background"
                                    value={form.data.budget}
                                    onChange={(e) =>
                                        form.setData('budget', e.target.value)
                                    }
                                />
                                <InputError message={errors.budget_cents} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="currency">Devise</Label>
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
                                        id="currency"
                                        className="bg-background w-full"
                                        aria-label="Devise"
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
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="origin_city">Ville d'origine</Label>
                            <Input
                                id="origin_city"
                                name="origin_city"
                                autoComplete="off"
                                className="bg-background"
                                value={form.data.origin_city}
                                onChange={(e) =>
                                    form.setData('origin_city', e.target.value)
                                }
                            />
                            <InputError message={errors.origin_city} />
                        </div>
                    </section>

                    <Separator />

                    <section className="grid gap-5">
                        <div>
                            <h2 className="text-base font-medium">Suivi</h2>
                            <p className="text-muted-foreground text-sm">
                                D'où vient le lead et ce qu'il vous a dit.
                            </p>
                        </div>
                        <div className="grid gap-2 sm:max-w-xs">
                            <Label htmlFor="source">Source</Label>
                            <Select
                                value={form.data.source}
                                onValueChange={(value) =>
                                    form.setData('source', value as LeadSource)
                                }
                            >
                                <SelectTrigger
                                    id="source"
                                    className="bg-background w-full"
                                    aria-label="Source"
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
                            <InputError message={errors.source} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="message">Message</Label>
                            <Textarea
                                id="message"
                                name="message"
                                rows={4}
                                className="bg-background"
                                placeholder="Besoins, contraintes, contexte…"
                                value={form.data.message}
                                onChange={(e) =>
                                    form.setData('message', e.target.value)
                                }
                            />
                            <InputError message={errors.message} />
                        </div>
                    </section>
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
