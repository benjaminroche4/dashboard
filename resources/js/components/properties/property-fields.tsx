import type { ReactNode } from 'react';
import InputError from '@/components/input-error';
import { AddressFields } from '@/components/real-estate/address-fields';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { districtFromPostalCode } from '@/lib/property-form';
import type { Currency, PropertyForm, PropertyFormOptions } from '@/types';

type Errors = Partial<Record<keyof PropertyForm, string | undefined>>;

/** Groupe de champs : titre, aide facultative, séparé du suivant par un trait. */
function Group({
    title,
    hint,
    children,
}: {
    title: string;
    hint?: string;
    children: ReactNode;
}) {
    return (
        <fieldset className="grid gap-4 py-5 first:pt-0 last:pb-0">
            <legend className="float-left mb-4 grid w-full gap-0.5">
                <span className="text-sm font-medium">{title}</span>
                {hint && (
                    <span className="text-muted-foreground text-sm">
                        {hint}
                    </span>
                )}
            </legend>
            {children}
        </fieldset>
    );
}

const NONE = '__none__';

/**
 * Champs d'un bien, regroupés par catégorie séparées d'un trait (Adresse,
 * Caractéristiques, Loyer et bail, Contacts et annonce, Notes), partagés
 * entre la page d'un bien et la planification d'une visite.
 */
export function PropertyFields({
    idPrefix,
    values,
    errors,
    options,
    onChange,
}: {
    idPrefix: string;
    values: PropertyForm;
    errors: Errors;
    options: PropertyFormOptions;
    onChange: (values: PropertyForm) => void;
}) {
    const set = <K extends keyof PropertyForm>(
        key: K,
        value: PropertyForm[K],
    ) => onChange({ ...values, [key]: value });

    const text = (
        key:
            | 'title'
            | 'rooms'
            | 'surface_m2'
            | 'floor'
            | 'charges'
            | 'listing_url'
            | 'district',
        label: string,
        props: {
            type?: string;
            placeholder?: string;
            min?: number;
            max?: number;
            step?: string;
        } = {},
    ) => (
        <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-${key}`}>{label}</Label>
            <Input
                id={`${idPrefix}-${key}`}
                value={values[key]}
                onChange={(event) => set(key, event.target.value)}
                autoComplete="off"
                {...props}
            />
            <InputError message={errors[key]} />
        </div>
    );

    const select = <
        K extends
            | 'status'
            | 'property_type'
            | 'furnished'
            | 'lease_type'
            | 'agent_id'
            | 'owner_id',
    >(
        key: K,
        label: string,
        items: { value: string; label: string; hint?: string | null }[],
        placeholder: string,
    ) => (
        <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-${key}`}>{label}</Label>
            <Select
                value={values[key] === '' ? NONE : String(values[key])}
                onValueChange={(value) =>
                    set(key, (value === NONE ? '' : value) as PropertyForm[K])
                }
            >
                <SelectTrigger id={`${idPrefix}-${key}`} className="w-full">
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={NONE}>{placeholder}</SelectItem>
                    {items.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                            {item.label}
                            {item.hint && (
                                <span className="text-muted-foreground">
                                    {' '}
                                    · {item.hint}
                                </span>
                            )}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <InputError message={errors[key]} />
        </div>
    );

    return (
        <div className="divide-foreground/10 grid divide-y">
            <Group title="Adresse" hint="Seule l’adresse est obligatoire.">
                {text('title', 'Titre', {
                    placeholder: 'Facultatif, ex. « T2 lumineux · 11e »',
                })}
                <AddressFields
                    idPrefix={idPrefix}
                    values={{
                        street: values.street,
                        postal_code: values.postal_code,
                        city: values.city,
                    }}
                    errors={errors}
                    onChange={(address) => {
                        const district = districtFromPostalCode(
                            address.postal_code,
                        );

                        onChange({
                            ...values,
                            ...address,
                            district:
                                district === null
                                    ? values.district
                                    : String(district),
                        });
                    }}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {text('district', 'Arrondissement', {
                        type: 'number',
                        min: 1,
                        max: 20,
                    })}
                </div>
            </Group>

            <Group title="Caractéristiques">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {select(
                        'status',
                        'Statut',
                        options.propertyStatuses,
                        'Disponible',
                    )}
                    {select(
                        'property_type',
                        'Type',
                        options.propertyTypes,
                        'Type de bien',
                    )}
                    {select(
                        'furnished',
                        'Meublé',
                        options.furnishedOptions,
                        'Meublé ?',
                    )}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {text('rooms', 'Pièces', { type: 'number', min: 1 })}
                    {text('surface_m2', 'Surface (m²)', {
                        type: 'number',
                        min: 1,
                    })}
                    {text('floor', 'Étage', {
                        type: 'number',
                        min: -5,
                        max: 60,
                        placeholder: '0 = rez-de-chaussée',
                    })}
                </div>
            </Group>

            <Group title="Loyer et bail">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="grid gap-2">
                        <Label htmlFor={`${idPrefix}-rent`}>
                            Loyer mensuel
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                id={`${idPrefix}-rent`}
                                type="number"
                                min={0}
                                step="1"
                                value={values.rent}
                                onChange={(event) =>
                                    set('rent', event.target.value)
                                }
                                autoComplete="off"
                                className="min-w-0 flex-1"
                            />
                            <Select
                                value={values.currency}
                                onValueChange={(value) =>
                                    set('currency', value as Currency)
                                }
                            >
                                <SelectTrigger
                                    aria-label="Devise"
                                    className="w-24"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {options.currencies.map((currency) => (
                                        <SelectItem
                                            key={currency}
                                            value={currency}
                                        >
                                            {currency}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <InputError message={errors.rent} />
                    </div>
                    {text('charges', 'Charges mensuelles', {
                        type: 'number',
                        min: 0,
                        step: '1',
                    })}
                    {select(
                        'lease_type',
                        'Type de bail',
                        options.leaseTypes,
                        'Type de bail',
                    )}
                </div>
            </Group>

            <Group
                title="Contacts et annonce"
                hint="L’agent du bien est proposé par défaut pour ses visites."
            >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {select(
                        'agent_id',
                        'Agent immobilier',
                        options.agents.map((agent) => ({
                            value: String(agent.id),
                            label: agent.name,
                            hint: agent.agency,
                        })),
                        'Aucun agent',
                    )}
                    {select(
                        'owner_id',
                        'Propriétaire',
                        options.owners.map((owner) => ({
                            value: String(owner.id),
                            label: owner.name,
                        })),
                        'Aucun propriétaire',
                    )}
                </div>
                {text('listing_url', 'Lien de l’annonce', {
                    type: 'url',
                    placeholder: 'https://…',
                })}
            </Group>

            <Group title="Notes">
                <div className="grid gap-2">
                    <Label htmlFor={`${idPrefix}-notes`}>Notes internes</Label>
                    <Textarea
                        id={`${idPrefix}-notes`}
                        rows={3}
                        value={values.notes}
                        onChange={(event) => set('notes', event.target.value)}
                        placeholder="Ascenseur, disponibilité, conditions, compléments d’informations…"
                    />
                    <InputError message={errors.notes} />
                </div>
            </Group>
        </div>
    );
}
