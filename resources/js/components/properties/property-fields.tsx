import {
    Banknote,
    Contact,
    Home,
    MapPin,
    NotebookPen,
    Plus,
    Sparkles,
    type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FormSection } from '@/components/form-section';
import InputError from '@/components/input-error';
import { OwnerDialog } from '@/components/owners/owner-dialog';
import { ChoicePills } from '@/components/leads/condition-choices';
import { PartnerDialog } from '@/components/partners/partner-dialog';
import { propertyStatusDots } from '@/components/properties/property-status-badge';
import {
    SearchSelect,
    type SearchSelectOption,
} from '@/components/search-select';
import { AddressFields } from '@/components/real-estate/address-fields';
import { AgentDialog } from '@/components/real-estate/agent-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { propertyAmenityIcons } from '@/lib/property-amenity-icons';
import { districtFromPostalCode } from '@/lib/property-form';
import { cn } from '@/lib/utils';
import type {
    Orientation,
    PropertyAmenity,
    PropertyForm,
    PropertyFormOptions,
} from '@/types';

type Errors = Partial<Record<keyof PropertyForm, string | undefined>>;

/** Les trois contacts qu'un bien peut porter, dans l'ordre du formulaire. */
type ContactKey = 'agent_id' | 'owner_id' | 'partner_id';

/**
 * Groupe de champs : intitulé discret au-dessus, puis les champs. En mode
 * « encadré » (page d'un bien), les champs vivent dans une carte blanche.
 */
function Group({
    title,
    hint,
    icon: Icon,
    framed,
    children,
}: {
    title: string;
    hint?: string;
    /** Pictogramme discret de la catégorie, pour la repérer d'un coup d'œil. */
    icon: LucideIcon;
    framed?: boolean;
    children: ReactNode;
}) {
    const heading = (
        <>
            <span className="flex items-center gap-2">
                {/* Pastille grise : l'icône de section se repère comme sur
                    les cartes `FormSection`. */}
                <span
                    aria-hidden
                    className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-md"
                >
                    <Icon className="size-3.5" />
                </span>
                {title}
            </span>
            {hint && (
                <span className="text-muted-foreground pl-8 text-sm">
                    {hint}
                </span>
            )}
        </>
    );

    if (!framed) {
        return (
            <fieldset className="grid gap-4 py-5 first:pt-0 last:pb-0">
                <legend className="float-left mb-4 grid w-full gap-0.5 text-sm font-medium">
                    {heading}
                </legend>
                {children}
            </fieldset>
        );
    }

    // Page d'un bien : le style de référence des formulaires du backoffice.
    return (
        <FormSection title={title} hint={hint} icon={Icon}>
            {children}
        </FormSection>
    );
}

const NONE = '__none__';

/**
 * Sélectionne l'entrée qui vient d'apparaître dans une liste d'options : les
 * dialogues « Nouvel agent » et « Nouveau propriétaire » rechargent les props
 * de la page sans dire ce qu'ils ont créé, la nouveauté est donc l'identifiant
 * absent de la liste au moment où le dialogue a été ouvert.
 */
function useCreatedOption(
    items: { id: number }[],
    onCreated: (id: number) => void,
) {
    const known = useRef<number[] | null>(null);

    useEffect(() => {
        if (known.current === null) {
            return;
        }

        const created = items.find((item) => !known.current!.includes(item.id));

        if (created) {
            known.current = null;
            onCreated(created.id);
        }
    }, [items, onCreated]);

    /** À appeler à l'ouverture du dialogue, pour figer la liste connue. */
    return () => {
        known.current = items.map((item) => item.id);
    };
}

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
    framed = false,
}: {
    idPrefix: string;
    values: PropertyForm;
    errors: Errors;
    options: PropertyFormOptions;
    onChange: (values: PropertyForm) => void;
    /** Chaque catégorie dans sa carte blanche, sur la page d'un bien. */
    framed?: boolean;
}) {
    const set = <K extends keyof PropertyForm>(
        key: K,
        value: PropertyForm[K],
    ) => onChange({ ...values, [key]: value });

    const text = (
        key:
            | 'rooms'
            | 'bedrooms'
            | 'bathrooms'
            | 'building_floors'
            | 'deposit'
            | 'surface_m2'
            | 'rent'
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

    /** Liste cherchable : l'annuaire des agents et des propriétaires est long. */
    const searchable = (
        key: ContactKey,
        label: string,
        items: SearchSelectOption[],
        {
            placeholder,
            search,
            empty,
        }: { placeholder: string; search: string; empty: string },
    ) => (
        <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-${key}`}>{label}</Label>
            <SearchSelect
                id={`${idPrefix}-${key}`}
                value={values[key]}
                onChange={(value) => set(key, value)}
                options={items}
                placeholder={placeholder}
                searchPlaceholder={search}
                emptyLabel={empty}
                noResults="Aucun résultat."
            />
            <InputError message={errors[key]} />
        </div>
    );

    const select = <
        K extends
            | 'status'
            | 'property_type'
            | 'furnished'
            | 'floor'
            | 'lease_type',
    >(
        key: K,
        label: string,
        items: {
            value: string;
            label: string;
            hint?: string | null;
            /** Classe de la pastille de couleur, quand la liste en porte. */
            dot?: string;
        }[],
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
                            {item.dot && (
                                <span
                                    aria-hidden
                                    className={cn(
                                        'size-2 shrink-0 rounded-full',
                                        item.dot,
                                    )}
                                />
                            )}
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

    const [agentOpen, setAgentOpen] = useState(false);
    const [ownerOpen, setOwnerOpen] = useState(false);
    const [partnerOpen, setPartnerOpen] = useState(false);
    const snapshotAgents = useCreatedOption(options.agents, (id) =>
        set('agent_id', String(id)),
    );
    const snapshotOwners = useCreatedOption(options.owners, (id) =>
        set('owner_id', String(id)),
    );
    const snapshotPartners = useCreatedOption(options.partners, (id) =>
        set('partner_id', String(id)),
    );

    const contactKinds: {
        key: ContactKey;
        label: string;
        placeholder: string;
        search: string;
        createLabel: string;
        create: () => void;
        items: () => SearchSelectOption[];
    }[] = [
        {
            key: 'agent_id',
            label: 'Agent immobilier',
            placeholder: 'Aucun agent',
            search: 'Rechercher un agent (nom, agence)…',
            createLabel: 'Nouvel agent',
            create: () => {
                snapshotAgents();
                setAgentOpen(true);
            },
            items: () =>
                options.agents.map((agent) => ({
                    value: String(agent.id),
                    label: agent.name,
                    hint: agent.agency,
                })),
        },
        {
            key: 'owner_id',
            label: 'Propriétaire',
            placeholder: 'Aucun propriétaire',
            search: 'Rechercher un propriétaire…',
            createLabel: 'Nouveau propriétaire',
            create: () => {
                snapshotOwners();
                setOwnerOpen(true);
            },
            items: () =>
                options.owners.map((owner) => ({
                    value: String(owner.id),
                    label: owner.name,
                })),
        },
        {
            key: 'partner_id',
            label: 'Partenaire',
            placeholder: 'Aucun partenaire',
            search: 'Rechercher un partenaire (nom, type)…',
            createLabel: 'Nouveau partenaire',
            create: () => {
                snapshotPartners();
                setPartnerOpen(true);
            },
            items: () =>
                options.partners.map((partner) => ({
                    value: String(partner.id),
                    label: partner.name,
                    hint: partner.type,
                })),
        },
    ];

    return (
        <div
            className={cn(
                'grid',
                // Encadré : des cartes blanches espacées, comme « Planifier une
                // visite ». Sinon (dans un dialogue), de simples filets.
                framed ? 'gap-4' : 'divide-foreground/10 divide-y',
            )}
        >
            <Group framed={framed} title="Adresse" icon={MapPin}>
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
                    // L'arrondissement finit la ligne : il tient du code postal.
                    trailing={text('district', 'Arrondissement', {
                        type: 'number',
                        min: 1,
                        max: 20,
                    })}
                />
            </Group>

            <Group framed={framed} title="Caractéristiques" icon={Home}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {/* La pastille reprend la couleur du badge de statut. */}
                    {select(
                        'status',
                        'Statut',
                        options.propertyStatuses.map((status) => ({
                            ...status,
                            dot: propertyStatusDots[status.value],
                        })),
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
                    {text('bedrooms', 'Chambres', { type: 'number', min: 0 })}
                    {text('bathrooms', 'Salles de bain', {
                        type: 'number',
                        min: 0,
                    })}
                    {text('surface_m2', 'Surface (m²)', {
                        type: 'number',
                        min: 1,
                    })}
                    {select('floor', 'Étage', options.floors, 'Quel étage ?')}
                    {text('building_floors', 'Étages de l’immeuble', {
                        type: 'number',
                        min: 0,
                    })}
                </div>
                <div className="grid gap-2">
                    <Label htmlFor={`${idPrefix}-orientations`}>
                        Orientation
                    </Label>
                    <ChoicePills
                        multiple
                        id={`${idPrefix}-orientations`}
                        label="Orientation"
                        options={options.orientations}
                        value={values.orientations}
                        onChange={(value) =>
                            set('orientations', value as Orientation[])
                        }
                    />
                    <InputError message={errors.orientations} />
                </div>
            </Group>

            {/* Équipements : la même liste que le formulaire « Proposer un bien » du site. */}
            <Group framed={framed} title="Équipements" icon={Sparkles}>
                <div className="grid gap-2">
                    <ChoicePills
                        multiple
                        id={`${idPrefix}-amenities`}
                        label="Équipements"
                        icons={propertyAmenityIcons}
                        options={options.amenities}
                        value={values.amenities}
                        onChange={(value) =>
                            set('amenities', value as PropertyAmenity[])
                        }
                    />
                    <InputError message={errors.amenities} />
                </div>
            </Group>

            <Group framed={framed} title="Loyer et bail" icon={Banknote}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {/* Un loyer parisien est toujours en euros : pas de devise à choisir. */}
                    {text('rent', 'Loyer mensuel (€)', {
                        type: 'number',
                        min: 0,
                        step: '1',
                    })}
                    {text(
                        'charges',
                        values.charges_included
                            ? 'Dont charges (€)'
                            : 'Charges mensuelles (€)',
                        {
                            type: 'number',
                            min: 0,
                            step: '1',
                        },
                    )}
                    {text('deposit', 'Dépôt de garantie (€)', {
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
                {/* Le loyer est hors charges par défaut ; certaines annonces l'affichent charges comprises. */}
                <div className="flex items-center gap-2">
                    <Checkbox
                        id={`${idPrefix}-charges_included`}
                        checked={values.charges_included}
                        onCheckedChange={(checked) =>
                            set('charges_included', checked === true)
                        }
                    />
                    <Label
                        htmlFor={`${idPrefix}-charges_included`}
                        className="font-normal"
                    >
                        Loyer charges comprises
                    </Label>
                </div>
            </Group>

            <Group
                framed={framed}
                title="Contacts et annonce"
                icon={Contact}
                hint="L’agent du bien est proposé par défaut pour ses visites."
            >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {contactKinds.map((kind) => (
                        <div key={kind.key} className="grid gap-2">
                            {searchable(kind.key, kind.label, kind.items(), {
                                placeholder: kind.placeholder,
                                search: kind.search,
                                empty: kind.placeholder,
                            })}
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                // Plus discret que le sélecteur qu'il complète :
                                // le projet n'a pas de taille en dessous de `sm`.
                                className="h-7 justify-self-start px-2 text-xs [&_svg]:size-3.5"
                                onClick={kind.create}
                            >
                                <Plus aria-hidden />
                                {kind.createLabel}
                            </Button>
                        </div>
                    ))}
                </div>
                {/* Créés sans quitter le formulaire : le nouveau contact est aussitôt sélectionné. */}
                <AgentDialog
                    open={agentOpen}
                    onOpenChange={setAgentOpen}
                    agencies={options.agencies}
                />
                <OwnerDialog
                    open={ownerOpen}
                    onOpenChange={setOwnerOpen}
                    kinds={options.ownerKinds}
                />
                <PartnerDialog
                    open={partnerOpen}
                    onOpenChange={setPartnerOpen}
                    types={options.partnerTypes}
                />
                {text('listing_url', 'Lien de l’annonce', {
                    type: 'url',
                    placeholder: 'https://…',
                })}
            </Group>

            <Group framed={framed} title="Notes" icon={NotebookPen}>
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
