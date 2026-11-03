import { Head, Link, router } from '@inertiajs/react';
import {
    Banknote,
    Bath,
    BedDouble,
    Building,
    Building2,
    CalendarDays,
    Calculator,
    Compass,
    DoorOpen,
    ExternalLink,
    FileDown,
    FileSignature,
    ImageIcon,
    Layers,
    Link2,
    Mail,
    MapPin,
    NotebookPen,
    Pencil,
    Phone,
    Receipt,
    Ruler,
    ShieldCheck,
    Sofa,
    Sparkles,
    TrainFront,
    UserCheck,
    UsersRound,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { AddressMapButton } from '@/components/address-map-dialog';
import { ClampedText } from '@/components/clamped-text';
import { CreatedBy } from '@/components/created-by';
import {
    InlineField,
    type InlineEdit,
    type InlineValue,
} from '@/components/inline-field';
import { initials, memberTone } from '@/components/leads/lead-assign-menu';
import { Fold, RuledRows, type Fact } from '@/components/leads/lead-show-body';
import { PhotoGallery, PhotoLightbox } from '@/components/photo-gallery';
import {
    PropertyAssignmentBanner,
    PropertyAssignmentButton,
} from '@/components/properties/property-assignment';
import { PropertyContactsDialog } from '@/components/properties/property-contacts-dialog';
import { PropertyStatusMenu } from '@/components/properties/property-status-menu';
import { TransitStopItem } from '@/components/properties/transit-stop-item';
import { formatAddress } from '@/components/real-estate/columns';
import { RealEstateRowActions } from '@/components/real-estate/real-estate-row-actions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { VisitStatusBadge } from '@/components/visits/visit-status-badge';
import { parisFormat } from '@/lib/datetime';
import { downloadPropertyPdf } from '@/lib/download-property-pdf';
import { formatMoney } from '@/lib/format';
import { propertyAmenityIcons } from '@/lib/property-amenity-icons';
import { notify } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { show as agencyShow } from '@/routes/agencies';
import { show as agentShow } from '@/routes/agents';
import { show as clientShow } from '@/routes/clients';
import { show as ownerShow } from '@/routes/owners';
import { show as partnerShow } from '@/routes/partners';
import {
    cover as propertyCover,
    destroy as propertyDestroy,
    fields as propertyFields,
    index as propertiesIndex,
    edit as propertyEdit,
} from '@/routes/properties';
import type {
    AgencyOption,
    Owner,
    Property,
    PropertyClient,
    PropertyFormOptions,
    PropertyVisit,
} from '@/types';

const visitDateTime = parisFormat({
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

type Props = PropertyFormOptions & {
    property: Property;
    /** Propriétaire rattaché, avec sa fiche complète pour la carte. */
    owner: Owner | null;
    /** Agence du bien, à défaut celle de son agent. */
    agency?: AgencyOption | null;
    /** Dossiers où le bien est proposé. */
    clients: PropertyClient[];
    /** Tous les dossiers clients en cours : l'attribution rapide les propose tous. */
    clientOptions?: PropertyClient[];
    visits: PropertyVisit[];
};

/** « 11e arrondissement », « 1er arrondissement ». */
function districtLabel(district: number): string {
    return `${district === 1 ? '1er' : `${district}e`} arrondissement`;
}

/** Une ligne de fiche, modifiable en place ; une valeur absente se lit « Non renseigné ». */
function fact(
    label: string,
    value: ReactNode | null | undefined,
    Icon: typeof Building,
    edit?: { name: string } & InlineEdit,
): Fact {
    const empty = value === null || value === undefined || value === '';

    return {
        label,
        value: empty ? null : value,
        empty,
        icon: <Icon className="size-4 shrink-0" aria-hidden />,
        edit,
    };
}

/**
 * Galerie d'en-tête, à la manière d'un site d'annonces : la photo principale
 * en grand, quatre autres à côté, et « Voir les n photos » qui ouvre le
 * diaporama. Sans photo, un aplat gris garde la place du visuel.
 */
function PhotoHero({ photos, label }: { photos: string[]; label: string }) {
    const [index, setIndex] = useState<number | null>(null);

    if (photos.length === 0) {
        return (
            <div className="bg-muted text-muted-foreground flex aspect-[3/1] flex-col items-center justify-center gap-2 rounded-xl border text-sm">
                <ImageIcon className="size-8" aria-hidden />
                Aucune photo. Ajoutez-en en modifiant le bien.
            </div>
        );
    }

    const others = photos.slice(1, 5);

    return (
        <section aria-label="Galerie" className="relative">
            <div
                className={cn(
                    'grid h-64 gap-2 overflow-hidden rounded-xl sm:h-96',
                    others.length > 0 && 'sm:grid-cols-[2fr_1fr]',
                )}
            >
                <button
                    type="button"
                    onClick={() => setIndex(0)}
                    className="group relative overflow-hidden"
                    aria-label="Agrandir la photo 1"
                >
                    <img
                        src={photos[0]}
                        alt={`Photo principale de ${label}`}
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none"
                    />
                </button>
                {others.length > 0 && (
                    <div
                        className={cn(
                            'hidden gap-2 sm:grid',
                            others.length > 1 && 'grid-cols-2',
                            others.length > 2 && 'grid-rows-2',
                        )}
                    >
                        {others.map((photo, offset) => (
                            <button
                                key={photo}
                                type="button"
                                onClick={() => setIndex(offset + 1)}
                                className={cn(
                                    'group relative overflow-hidden',
                                    others.length === 3 &&
                                        offset === 0 &&
                                        'col-span-2',
                                )}
                                aria-label={`Agrandir la photo ${offset + 2}`}
                            >
                                <img
                                    src={photo}
                                    alt=""
                                    loading="lazy"
                                    className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
                                />
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-background/95 absolute right-3 bottom-3 shadow-sm"
                onClick={() => setIndex(0)}
            >
                <ImageIcon aria-hidden />
                Voir les {photos.length} photo{photos.length > 1 ? 's' : ''}
            </Button>
            <PhotoLightbox
                photos={photos}
                label={label}
                index={index}
                onIndexChange={setIndex}
                onOpenChange={(open) => !open && setIndex(null)}
            />
        </section>
    );
}

/** Une personne de l'encadré contact : rôle, nom en lien, téléphone, e-mail. */
function ContactRow({
    role,
    id,
    name,
    href,
    detail,
    phone,
    email,
}: {
    role: string;
    id: number;
    name: string;
    href: string;
    detail?: string | null;
    phone?: string | null;
    email?: string | null;
}) {
    return (
        <li className="grid gap-2 py-3 first:pt-0 last:pb-0">
            <div className="flex items-center gap-3">
                <Avatar className="size-9 shrink-0">
                    <AvatarFallback className={cn('text-xs', memberTone(id))}>
                        {initials(name)}
                    </AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 gap-0.5 text-sm">
                    <span className="text-muted-foreground text-xs">
                        {role}
                    </span>
                    <Link
                        href={href}
                        className="truncate font-medium underline-offset-4 hover:underline"
                    >
                        {name}
                    </Link>
                    {detail && (
                        <span className="text-muted-foreground truncate text-xs">
                            {detail}
                        </span>
                    )}
                </div>
            </div>
            {(phone || email) && (
                <div className="grid gap-1.5">
                    {phone && (
                        <Button variant="outline" size="sm" asChild>
                            <a href={`tel:${phone.replace(/\s+/g, '')}`}>
                                <Phone aria-hidden />
                                {phone}
                            </a>
                        </Button>
                    )}
                    {email && (
                        <Button variant="outline" size="sm" asChild>
                            <a href={`mailto:${email}`} className="min-w-0">
                                <Mail aria-hidden />
                                <span className="truncate">{email}</span>
                            </a>
                        </Button>
                    )}
                </div>
            )}
        </li>
    );
}

/**
 * Fiche d'un bien **présentée comme une annonce** (2 novembre 2026, « type
 * leboncoin : listing puis détail ») : la galerie en tête, puis à gauche le
 * titre, l'adresse et le prix, et les sections de l'annonce en accordéons
 * mémorisés par bien (description, logement, loyer et bail, équipements,
 * localisation, visites, photos), **modifiables en place** ligne à ligne
 * (`properties.fields`). À droite, un encadré collant : les contacts, posés
 * ensemble par une action rapide, et le locataire retenu.
 */
export default function PropertyShow({
    property,
    propertyStatuses,
    furnishedOptions,
    propertyTypes,
    floors,
    leaseTypes,
    orientations,
    amenities,
    owners,
    agencies,
    agents,
    partners,
    ownerKinds,
    partnerTypes,
    owner,
    agency = null,
    clients,
    clientOptions,
    visits,
}: Props) {
    const [contactsOpen, setContactsOpen] = useState(false);
    const [saving, setSaving] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const address = formatAddress(property);
    const money = (cents: number | null) =>
        cents === null ? null : formatMoney(cents, property.currency);
    const rent = money(property.rent_cents);
    const charges = money(property.charges_cents);
    // Le coût réel pour le client : loyer et charges réunis.
    const monthlyTotal =
        property.rent_cents !== null &&
        property.charges_cents !== null &&
        !property.charges_included
            ? money(property.rent_cents + property.charges_cents)
            : null;
    const rentHint = property.charges_included
        ? 'charges comprises'
        : charges
          ? `+ ${charges} de charges`
          : 'hors charges';
    // La référence du dossier attribué se lit dans la liste des dossiers.
    const tenantReference =
        [...clients, ...(clientOptions ?? [])].find(
            (client) => client.uuid === property.assigned_lead?.uuid,
        )?.reference ?? null;
    const storage = `property.${property.uuid}`;

    const save = (name: string, value: InlineValue) => {
        setSaving(name);
        setErrors({});
        router.patch(
            propertyFields({ property: property.uuid }).url,
            {
                [name]: name === 'charges_included' ? value === '1' : value,
            },
            {
                preserveScroll: true,
                onError: (received) => {
                    const message =
                        Object.values(received)[0] ??
                        'Le champ n’a pas pu être enregistré.';
                    setErrors({ [name]: message });
                    notify.error('Modification refusée', message);
                },
                onFinish: () => setSaving(null),
            },
        );
    };

    const number = (
        value: number | null,
        options: { min?: number; max?: number; suffix?: string } = {},
    ) => ({ kind: 'number' as const, value, ...options });

    const housing: Fact[] = [
        fact('Type', property.property_type_label, Building2, {
            name: 'property_type',
            kind: 'select',
            value: property.property_type,
            options: propertyTypes,
        }),
        fact('Meublé', property.furnished_label, Sofa, {
            name: 'furnished',
            kind: 'select',
            value: property.furnished,
            options: furnishedOptions,
        }),
        fact(
            'Surface',
            property.surface_m2 !== null ? `${property.surface_m2} m²` : null,
            Ruler,
            {
                name: 'surface_m2',
                ...number(property.surface_m2, {
                    min: 1,
                    max: 5000,
                    suffix: 'm²',
                }),
            },
        ),
        fact('Pièces', property.rooms, DoorOpen, {
            name: 'rooms',
            ...number(property.rooms, { min: 1, max: 30 }),
        }),
        fact('Chambres', property.bedrooms, BedDouble, {
            name: 'bedrooms',
            ...number(property.bedrooms, { min: 0, max: 30 }),
        }),
        fact('Salles de bain', property.bathrooms, Bath, {
            name: 'bathrooms',
            ...number(property.bathrooms, { min: 0, max: 10 }),
        }),
        fact('Étage', property.floor_label, Layers, {
            name: 'floor',
            kind: 'select',
            value: property.floor,
            options: floors,
        }),
        fact('Étages de l’immeuble', property.building_floors, Building, {
            name: 'building_floors',
            ...number(property.building_floors, { min: 0, max: 60 }),
        }),
        fact(
            'Orientation',
            property.orientation_labels.length > 0
                ? property.orientation_labels.join(', ')
                : null,
            Compass,
            {
                name: 'orientations',
                kind: 'multi',
                value: property.orientations,
                options: orientations,
            },
        ),
    ];

    const lease: Fact[] = [
        fact(
            property.charges_included
                ? 'Loyer charges comprises'
                : 'Loyer hors charges',
            rent ? `${rent} / mois` : null,
            Banknote,
            {
                name: 'rent_cents',
                kind: 'money',
                value: property.rent_cents,
                suffix: '€ / mois',
            },
        ),
        fact(
            property.charges_included ? 'Dont charges' : 'Charges',
            charges ? `${charges} / mois` : null,
            Receipt,
            {
                name: 'charges_cents',
                kind: 'money',
                value: property.charges_cents,
                suffix: '€ / mois',
            },
        ),
        fact(
            'Charges dans le loyer',
            property.charges_included ? 'Comprises' : 'Non comprises',
            Calculator,
            {
                name: 'charges_included',
                kind: 'select',
                value: property.charges_included ? '1' : '0',
                options: [
                    { value: '0', label: 'Non comprises' },
                    { value: '1', label: 'Comprises' },
                ],
            },
        ),
        ...(monthlyTotal
            ? [fact('Total mensuel', `${monthlyTotal} / mois`, Calculator)]
            : []),
        fact('Dépôt de garantie', money(property.deposit_cents), ShieldCheck, {
            name: 'deposit_cents',
            kind: 'money',
            value: property.deposit_cents,
            suffix: '€',
        }),
        fact('Bail', property.lease_type_label, FileSignature, {
            name: 'lease_type',
            kind: 'select',
            value: property.lease_type,
            options: leaseTypes,
        }),
        fact(
            'Annonce',
            property.listing_url ? (
                <a
                    href={property.listing_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                >
                    Ouvrir l’annonce
                    <ExternalLink className="size-3.5" aria-hidden />
                </a>
            ) : null,
            Link2,
            {
                name: 'listing_url',
                kind: 'text',
                value: property.listing_url,
                placeholder: 'https://…',
            },
        ),
    ];

    const place = {
        name: property.label,
        address,
        street: property.street,
        latitude: property.latitude,
        longitude: property.longitude,
    };

    const missingContacts = owner === null || property.agent === null;

    return (
        <>
            <Head title={`Bien ${property.label}`} />
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pt-8 pb-10">
                <PhotoHero photos={property.photos} label={property.label} />

                <div
                    className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]"
                    data-testid="property-columns"
                >
                    {/* L'annonce. */}
                    <article className="grid min-w-0 content-start gap-6">
                        <header className="grid gap-3 border-b pb-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="grid min-w-0 gap-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h1 className="text-2xl font-semibold tracking-tight">
                                            {property.label}
                                        </h1>
                                        {/* La disponibilité se change ici,
                                            sans passer par le formulaire. */}
                                        <PropertyStatusMenu
                                            property={property}
                                            statuses={propertyStatuses}
                                        />
                                    </div>
                                    {address && (
                                        <p className="text-muted-foreground inline-flex min-w-0 items-center gap-1.5 text-sm">
                                            <MapPin
                                                className="size-4 shrink-0"
                                                aria-hidden
                                            />
                                            <span>
                                                {address}
                                                {property.district &&
                                                    ` · ${districtLabel(property.district)}`}
                                            </span>
                                        </p>
                                    )}
                                </div>
                                <RealEstateRowActions
                                    triggerVariant="outline"
                                    name={property.label}
                                    deleteUrl={
                                        propertyDestroy({
                                            property: property.uuid,
                                        }).url
                                    }
                                    deleteTitle={`Supprimer le bien ${property.label} ?`}
                                    deleteDescription="Sa fiche et ses visites seront effacées. Cette action est irréversible."
                                    onEdit={() =>
                                        router.visit(
                                            propertyEdit({
                                                property: property.uuid,
                                            }).url,
                                        )
                                    }
                                    extra={
                                        <DropdownMenuItem
                                            onSelect={() =>
                                                downloadPropertyPdf(
                                                    property.uuid,
                                                    property.label,
                                                )
                                            }
                                        >
                                            <FileDown aria-hidden />
                                            Fiche PDF
                                        </DropdownMenuItem>
                                    }
                                />
                            </div>
                            <p
                                className="flex flex-wrap items-baseline gap-x-2"
                                data-testid="property-price"
                            >
                                {rent ? (
                                    <>
                                        <span className="text-3xl font-semibold tabular-nums">
                                            {rent}
                                        </span>
                                        <span className="text-muted-foreground text-sm tabular-nums">
                                            / mois · {rentHint}
                                            {monthlyTotal &&
                                                ` · ${monthlyTotal} au total`}
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-muted-foreground">
                                        Loyer non renseigné
                                    </span>
                                )}
                            </p>
                            {property.creator && (
                                <p className="text-muted-foreground text-xs">
                                    <CreatedBy
                                        name={property.creator}
                                        avatar={property.creator_avatar}
                                        date={property.created_at}
                                        verb="Ajouté par"
                                    />
                                </p>
                            )}
                        </header>

                        {/* Bien attribué : le bandeau vert passe avant le reste. */}
                        <PropertyAssignmentBanner property={property} />

                        <div className="divide-y">
                            <Fold
                                title="Description"
                                icon={NotebookPen}
                                defaultOpen
                                storageKey={`${storage}.description`}
                            >
                                <InlineField
                                    label="Description"
                                    display={
                                        property.notes ? (
                                            <ClampedText
                                                text={property.notes}
                                                className="text-sm/6 font-normal whitespace-pre-line"
                                            />
                                        ) : (
                                            <span className="text-muted-foreground text-sm font-normal">
                                                Aucune description. Cliquez pour
                                                en écrire une.
                                            </span>
                                        )
                                    }
                                    edit={{
                                        kind: 'textarea',
                                        value: property.notes,
                                        placeholder:
                                            'Ascenseur, disponibilité, conditions, digicode…',
                                    }}
                                    saving={saving === 'notes'}
                                    error={errors.notes}
                                    onSave={(value) => save('notes', value)}
                                />
                            </Fold>

                            <Fold
                                title="Le logement en détail"
                                icon={Building2}
                                defaultOpen
                                storageKey={`${storage}.housing`}
                            >
                                <RuledRows
                                    facts={housing}
                                    onSave={save}
                                    saving={saving}
                                    errors={errors}
                                />
                            </Fold>

                            <Fold
                                title="Loyer et bail"
                                icon={Banknote}
                                defaultOpen
                                storageKey={`${storage}.lease`}
                            >
                                <RuledRows
                                    facts={lease}
                                    onSave={save}
                                    saving={saving}
                                    errors={errors}
                                />
                            </Fold>

                            <Fold
                                title="Équipements"
                                icon={Sparkles}
                                count={property.amenities.length}
                                defaultOpen
                                storageKey={`${storage}.amenities`}
                            >
                                <InlineField
                                    label="Équipements"
                                    display={
                                        property.amenities.length > 0 ? (
                                            <ul
                                                role="list"
                                                className="grid w-full grid-cols-2 gap-3 font-normal sm:grid-cols-3"
                                            >
                                                {property.amenities.map(
                                                    (amenity, index) => {
                                                        const Icon =
                                                            propertyAmenityIcons[
                                                                amenity
                                                            ];

                                                        return (
                                                            <li
                                                                key={amenity}
                                                                className="flex items-center gap-2 text-sm"
                                                            >
                                                                {Icon && (
                                                                    <Icon
                                                                        className="text-muted-foreground size-4 shrink-0"
                                                                        aria-hidden
                                                                    />
                                                                )}
                                                                {property
                                                                    .amenity_labels[
                                                                    index
                                                                ] ?? amenity}
                                                            </li>
                                                        );
                                                    },
                                                )}
                                            </ul>
                                        ) : (
                                            <span className="text-muted-foreground text-sm font-normal">
                                                Aucun équipement renseigné.
                                            </span>
                                        )
                                    }
                                    edit={{
                                        kind: 'multi',
                                        value: property.amenities,
                                        options: amenities,
                                    }}
                                    saving={saving === 'amenities'}
                                    error={errors.amenities}
                                    onSave={(value) => save('amenities', value)}
                                />
                            </Fold>

                            <Fold
                                title="Localisation"
                                icon={MapPin}
                                defaultOpen
                                storageKey={`${storage}.location`}
                                action={<AddressMapButton place={place} />}
                            >
                                <p className="text-sm font-medium">
                                    {address ?? property.street}
                                </p>
                                {property.transit.length > 0 && (
                                    <div className="grid gap-2">
                                        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                                            <TrainFront
                                                className="size-3.5"
                                                aria-hidden
                                            />
                                            Transports proches
                                        </p>
                                        <ul role="list" className="grid gap-2">
                                            {property.transit.map(
                                                (stop, index) => (
                                                    <li
                                                        key={`${stop.kind}-${stop.name}-${index}`}
                                                    >
                                                        <TransitStopItem
                                                            stop={stop}
                                                        />
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                    </div>
                                )}
                            </Fold>

                            <Fold
                                title="Visites"
                                icon={CalendarDays}
                                count={visits.length}
                                defaultOpen
                                storageKey={`${storage}.visits`}
                            >
                                {visits.length > 0 ? (
                                    <ul
                                        role="list"
                                        className="divide-y text-sm"
                                    >
                                        {visits.map((visit) => (
                                            <li
                                                key={visit.uuid}
                                                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                                            >
                                                <div className="grid min-w-0 gap-0.5">
                                                    <Link
                                                        href={clientShow({
                                                            lead: visit.client
                                                                .uuid,
                                                        })}
                                                        className="truncate font-medium underline-offset-4 hover:underline"
                                                    >
                                                        {visit.client.name}
                                                    </Link>
                                                    <span className="text-muted-foreground truncate text-xs tabular-nums">
                                                        {visitDateTime.format(
                                                            new Date(
                                                                visit.scheduled_at,
                                                            ),
                                                        )}
                                                        {visit.agent &&
                                                            ` · ${visit.agent}`}
                                                    </span>
                                                </div>
                                                <VisitStatusBadge
                                                    status={visit.status}
                                                    label={visit.status_label}
                                                />
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-muted-foreground text-sm">
                                        Aucune visite pour ce bien.
                                    </p>
                                )}
                            </Fold>

                            {property.photos.length > 0 && (
                                <Fold
                                    title="Toutes les photos"
                                    icon={ImageIcon}
                                    count={property.photos.length}
                                    storageKey={`${storage}.photos`}
                                >
                                    <p className="text-muted-foreground text-xs">
                                        L’étoile désigne la photo principale,
                                        affichée en tête de l’annonce et dans
                                        les listes.
                                    </p>
                                    <PhotoGallery
                                        photos={property.photos}
                                        label={property.label}
                                        className="grid grid-cols-3 gap-3 sm:grid-cols-4"
                                        onSetCover={(index) =>
                                            router.patch(
                                                propertyCover({
                                                    property: property.uuid,
                                                }).url,
                                                { index },
                                                { preserveScroll: true },
                                            )
                                        }
                                    />
                                </Fold>
                            )}
                        </div>
                    </article>

                    {/* L'encadré de l'annonce : qui appeler, et le locataire. */}
                    <aside className="bg-sidebar grid h-fit content-start gap-4 rounded-xl border p-4 lg:sticky lg:top-20">
                        <section aria-label="Contacts" className="grid gap-3">
                            <header className="flex items-center justify-between gap-2">
                                <h2 className="flex items-center gap-1.5 text-sm font-medium">
                                    <UsersRound
                                        className="text-muted-foreground size-4"
                                        aria-hidden
                                    />
                                    Contacts
                                </h2>
                                <Button
                                    type="button"
                                    variant={
                                        missingContacts ? 'default' : 'outline'
                                    }
                                    size="sm"
                                    onClick={() => setContactsOpen(true)}
                                >
                                    <Pencil aria-hidden />
                                    {missingContacts ? 'Rattacher' : 'Modifier'}
                                </Button>
                            </header>
                            <ul role="list" className="divide-y">
                                {owner ? (
                                    <ContactRow
                                        role="Propriétaire"
                                        id={owner.id}
                                        name={owner.name}
                                        href={
                                            ownerShow({ owner: owner.uuid }).url
                                        }
                                        detail={owner.kind_label}
                                        phone={owner.phone}
                                        email={owner.email}
                                    />
                                ) : (
                                    <EmptyContact
                                        onClick={() => setContactsOpen(true)}
                                    >
                                        Ajouter un propriétaire
                                    </EmptyContact>
                                )}
                                {agency && (
                                    <ContactRow
                                        role="Agence"
                                        id={agency.id}
                                        name={agency.name}
                                        href={
                                            agencyShow({ agency: agency.uuid })
                                                .url
                                        }
                                        detail={agency.address}
                                    />
                                )}
                                {property.agent ? (
                                    <ContactRow
                                        role="Agent"
                                        id={property.agent.id}
                                        name={property.agent.name}
                                        href={
                                            agentShow({
                                                agent: property.agent.uuid,
                                            }).url
                                        }
                                        detail={
                                            property.agent.agency ??
                                            'Indépendant'
                                        }
                                    />
                                ) : (
                                    <EmptyContact
                                        onClick={() => setContactsOpen(true)}
                                    >
                                        {agency
                                            ? 'Ajouter un agent'
                                            : 'Ajouter une agence ou un agent'}
                                    </EmptyContact>
                                )}
                                {property.partner && (
                                    <ContactRow
                                        role="Partenaire"
                                        id={property.partner.id}
                                        name={property.partner.name}
                                        href={
                                            partnerShow({
                                                partner: property.partner.uuid,
                                            }).url
                                        }
                                        detail={property.partner.type}
                                    />
                                )}
                            </ul>
                        </section>

                        {/* Un bien n'a qu'un locataire à la fin : celui à qui
                            il est attribué. */}
                        <section
                            aria-label="Locataire définitif"
                            className="grid gap-3 border-t pt-4"
                        >
                            <h2 className="flex items-center gap-1.5 text-sm font-medium">
                                <UserCheck
                                    className="text-muted-foreground size-4"
                                    aria-hidden
                                />
                                Locataire définitif
                            </h2>
                            {property.assigned_lead ? (
                                <div className="flex items-center gap-3 text-sm">
                                    <Avatar className="size-9 shrink-0">
                                        <AvatarFallback className="bg-green-100 text-xs text-green-800 dark:bg-green-950 dark:text-green-200">
                                            {initials(
                                                property.assigned_lead.name,
                                            )}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid min-w-0 gap-0.5">
                                        <Link
                                            href={clientShow({
                                                lead: property.assigned_lead
                                                    .uuid,
                                            })}
                                            className="truncate font-medium underline-offset-4 hover:underline"
                                        >
                                            {property.assigned_lead.name}
                                        </Link>
                                        {tenantReference && (
                                            <span className="text-muted-foreground text-xs tabular-nums">
                                                {tenantReference}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-sm">
                                    Aucun locataire pour l’instant : un bien
                                    attribué n’est plus proposé ailleurs.
                                </p>
                            )}
                            {/* Tous les dossiers en cours, pas seulement ceux
                                où le bien est déjà proposé. */}
                            <PropertyAssignmentButton
                                property={property}
                                clients={clientOptions ?? clients}
                            />
                        </section>
                    </aside>
                </div>
            </div>
            <PropertyContactsDialog
                open={contactsOpen}
                onOpenChange={setContactsOpen}
                property={property}
                agencyId={agency?.id ?? null}
                options={{
                    owners,
                    agencies,
                    agents,
                    partners,
                    ownerKinds,
                    partnerTypes,
                }}
            />
        </>
    );
}

/** Rôle encore vide de l'encadré : un clic ouvre l'action rapide. */
function EmptyContact({
    onClick,
    children,
}: {
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <li className="py-3 first:pt-0 last:pb-0">
            <button
                type="button"
                onClick={onClick}
                className="text-muted-foreground hover:text-foreground hover:border-foreground/30 bg-background flex w-full items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-left text-sm transition-colors"
            >
                <span className="text-base leading-none" aria-hidden>
                    +
                </span>
                {children}
            </button>
        </li>
    );
}

PropertyShow.layout = {
    breadcrumbs: [
        { title: 'Annuaire', href: propertiesIndex() },
        { title: 'Biens', href: propertiesIndex() },
        { title: 'Fiche', href: '#' },
    ],
};
