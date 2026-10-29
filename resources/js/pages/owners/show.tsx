import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Building2,
    Contact,
    Home,
    Mail,
    Phone,
    Plus,
    UserRound,
} from 'lucide-react';
import { useState } from 'react';
import { AddressMap, AddressMapButton } from '@/components/address-map-dialog';
import { CreatedBy } from '@/components/created-by';
import type { InlineValue } from '@/components/inline-field';
import { initials, memberTone } from '@/components/leads/lead-assign-menu';
import {
    Fold,
    Rows,
    Section,
    type Fact,
} from '@/components/leads/lead-show-body';
import { OwnerDialog } from '@/components/owners/owner-dialog';
import { OwnerKindBadge } from '@/components/owners/owner-kind-badge';
import {
    OwnerPhotoMenuItem,
    OwnerPhotoTile,
} from '@/components/owners/owner-photo-upload';
import { PropertyThumb } from '@/components/properties/property-thumb';
import { formatAddress } from '@/components/real-estate/columns';
import { missingValue } from '@/components/real-estate/detail-header';
import { DirectoryFollowUp } from '@/components/real-estate/directory-follow-up';
import { RealEstateRowActions } from '@/components/real-estate/real-estate-row-actions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { parisFormat } from '@/lib/datetime';
import { formatMoney } from '@/lib/format';
import { notify } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { show as leadShow } from '@/routes/leads';
import {
    contact as ownerContact,
    destroy as ownerDestroy,
    fields as ownerFields,
    index as ownersIndex,
} from '@/routes/owners';
import {
    create as propertyCreate,
    show as propertyShow,
} from '@/routes/properties';
import type {
    ContactHistoryEntry,
    Owner,
    OwnerKindOption,
    OwnerParcStats,
    Property,
} from '@/types';

type Props = {
    /** Carte statique de l'adresse, repli sans clé navigateur (un propriétaire n'est pas géocodé). */
    mapUrl?: string | null;
    owner: Owner;
    /** Biens de l'annuaire rattachés à ce propriétaire. */
    properties: Property[];
    /** État du parc : ce que la liste ne dit pas. */
    stats: OwnerParcStats;
    kinds: OwnerKindOption[];
    /** Tous les échanges notés, pour « Voir l'historique ». */
    contacts?: ContactHistoryEntry[];
};

const visitDate = parisFormat({
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

/** Valeur d'une ligne de contact : lien cliquable, texte, ou « Non renseigné ». */
function contactValue(value: string | null, href: string | null) {
    if (!value) {
        return missingValue;
    }

    return href ? (
        <a href={href} className="underline-offset-4 hover:underline">
            {value}
        </a>
    ) : (
        value
    );
}

/**
 * Fiche d'un propriétaire, **sur le moule des autres fiches de l'annuaire**
 * (29 octobre 2026) : deux moitiés égales séparées d'un filet. À gauche,
 * l'en-tête gris (portrait ou logo, nom, type, interlocuteur, « Ajouté(e)
 * par », menu « ⋯ » avec Modifier et le retrait de la photo), le contact en
 * lignes deux par deux modifiables en place (`owners.fields`) avec l'adresse
 * en une ligne Google Places et la carte statique, puis la frise « Suivi et
 * notes ». À droite, le lead propriétaire d'origine et les biens, en
 * accordéons.
 */
export default function OwnerShow({
    owner,
    properties,
    stats,
    kinds,
    mapUrl = null,
    contacts = [],
}: Props) {
    const [editing, setEditing] = useState(false);
    const [savingField, setSavingField] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const { features } = usePage().props;
    const address = formatAddress(owner);
    const saveField = (name: string, value: InlineValue) => {
        setSavingField(name);
        setFieldErrors({});
        router.patch(
            ownerFields({ owner: owner.uuid }).url,
            // Un champ composé (l'adresse) envoie ses trois colonnes.
            value !== null && typeof value === 'object' && !Array.isArray(value)
                ? value
                : { [name]: value },
            {
                preserveScroll: true,
                onError: (errors) => {
                    const message =
                        Object.values(errors)[0] ??
                        'Le champ n’a pas pu être enregistré.';
                    setFieldErrors({ [name]: message });
                    notify.error('Modification refusée', message);
                },
                onFinish: () => setSavingField(null),
            },
        );
    };

    const contact: Fact[] = [
        {
            label: 'Téléphone',
            icon: <Phone className="size-3.5" aria-hidden />,
            value: contactValue(
                owner.phone,
                owner.phone ? `tel:${owner.phone.replace(/\s+/g, '')}` : null,
            ),
            edit: { name: 'phone', kind: 'text', value: owner.phone },
        },
        {
            label: 'E-mail',
            icon: <Mail className="size-3.5" aria-hidden />,
            value: contactValue(
                owner.email,
                owner.email ? `mailto:${owner.email}` : null,
            ),
            edit: { name: 'email', kind: 'text', value: owner.email },
        },
        ...(owner.kind === 'company'
            ? [
                  {
                      label: 'Raison sociale',
                      icon: <Building2 className="size-3.5" aria-hidden />,
                      value: owner.company ?? missingValue,
                      edit: {
                          name: 'company',
                          kind: 'text' as const,
                          value: owner.company,
                      },
                  },
              ]
            : []),
        {
            label: 'Adresse',
            icon: <Home className="size-3.5" aria-hidden />,
            value: address ?? missingValue,
            edit: {
                name: 'address',
                kind: 'postal_address',
                street: owner.street,
                postalCode: owner.postal_code,
                city: owner.city,
                enabled: features.addressAutocomplete,
            },
        },
    ];

    const header = (
        <div
            className="bg-sidebar flex items-start justify-between gap-4 rounded-xl border p-4"
            data-testid="owner-header"
        >
            <div className="flex min-w-0 items-center gap-4">
                <OwnerPhotoTile owner={owner} />
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="truncate text-lg font-medium">
                            {owner.name}
                        </h1>
                        <OwnerKindBadge
                            kind={owner.kind}
                            label={owner.kind_label}
                        />
                    </div>
                    <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm">
                        <span className="inline-flex items-center gap-1 tabular-nums">
                            <Home className="size-3.5" aria-hidden />
                            {owner.properties_count} bien(s)
                        </span>
                        {owner.contact_name && (
                            <>
                                <span>·</span>
                                <span className="inline-flex items-center gap-1">
                                    <UserRound
                                        className="size-3.5"
                                        aria-hidden
                                    />
                                    {owner.contact_name}
                                </span>
                            </>
                        )}
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                        <CreatedBy
                            name={owner.creator}
                            avatar={owner.creator_avatar}
                            date={owner.created_at}
                            verb="Ajouté(e) par"
                        />
                    </p>
                </div>
            </div>
            <RealEstateRowActions
                triggerVariant="outline"
                name={owner.name}
                deleteUrl={ownerDestroy({ owner: owner.uuid }).url}
                deleteTitle={`Supprimer le propriétaire ${owner.name} ?`}
                deleteDescription="Sa fiche sera effacée ; ses biens sont conservés, sans propriétaire. Cette action est irréversible."
                onEdit={() => setEditing(true)}
                extra={<OwnerPhotoMenuItem owner={owner} />}
            />
        </div>
    );

    return (
        <>
            <Head title={`Propriétaire ${owner.name}`} />
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-8 pb-10 lg:pb-0">
                <div
                    className="grid gap-8 lg:flex-1 lg:grid-cols-2 lg:gap-0 lg:divide-x"
                    data-testid="owner-columns"
                >
                    {/* Qui il est et la relation. */}
                    <div className="grid content-start gap-6 lg:sticky lg:top-20 lg:-ml-3 lg:max-h-[calc(100dvh-5rem)] lg:self-start lg:overflow-y-auto lg:pr-8 lg:pb-8 lg:pl-3">
                        {header}
                        <div>
                            <Section
                                title="Contact"
                                icon={Contact}
                                className="border-b pb-6 last:pb-6"
                                action={
                                    <AddressMapButton
                                        place={{
                                            name: owner.name,
                                            address,
                                            street: owner.street,
                                            latitude: null,
                                            longitude: null,
                                        }}
                                    />
                                }
                            >
                                <AddressMap
                                    place={{
                                        name: owner.name,
                                        address,
                                        street: owner.street,
                                        latitude: null,
                                        longitude: null,
                                    }}
                                    fallback={mapUrl}
                                />
                                <Rows
                                    facts={contact}
                                    columns={2}
                                    onSave={saveField}
                                    saving={savingField}
                                    errors={fieldErrors}
                                />
                            </Section>
                            <DirectoryFollowUp
                                name={owner.name}
                                lastContactedAt={owner.last_contacted_at}
                                touchUrl={
                                    ownerContact({ owner: owner.uuid }).url
                                }
                                contacts={contacts}
                                notes={owner.notes}
                                saving={savingField === 'notes'}
                                error={fieldErrors.notes}
                                onSaveNotes={(value) =>
                                    saveField('notes', value)
                                }
                            />
                        </div>
                    </div>
                    {/* D'où vient la fiche, et ce qu'il possède. */}
                    <div className="grid min-w-0 content-start lg:pb-10 lg:pl-8">
                        <div className="divide-y">
                            {owner.lead && (
                                /* La prospection reste le lead ; l'annuaire garde le lien. */
                                <Fold
                                    title="Lead propriétaire"
                                    icon={UserRound}
                                    defaultOpen
                                    storageKey={`owner.${owner.uuid}.lead`}
                                >
                                    <div className="bg-sidebar flex items-center gap-3 rounded-lg border p-3 text-sm">
                                        <Avatar className="size-9 shrink-0">
                                            <AvatarFallback
                                                className={cn(
                                                    'text-xs',
                                                    memberTone(owner.lead.id),
                                                )}
                                            >
                                                {initials(owner.lead.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="grid min-w-0 gap-0.5">
                                            <Link
                                                href={leadShow({
                                                    lead: owner.lead.uuid,
                                                })}
                                                className="truncate font-medium underline-offset-4 hover:underline"
                                            >
                                                {owner.lead.name}
                                            </Link>
                                            <span className="text-muted-foreground text-xs">
                                                {[
                                                    owner.lead.reference,
                                                    owner.lead.status_label,
                                                    owner.lead.assignee,
                                                ]
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                            </span>
                                        </div>
                                    </div>
                                </Fold>
                            )}
                            <Fold
                                title="Biens"
                                icon={Home}
                                count={properties.length}
                                defaultOpen={properties.length > 0}
                                storageKey={`owner.${owner.uuid}.properties`}
                                action={
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:text-foreground size-7 rounded-full"
                                        aria-label="Ajouter un bien"
                                        title="Ajouter un bien"
                                        asChild
                                    >
                                        <Link
                                            href={propertyCreate({
                                                query: { owner: owner.uuid },
                                            })}
                                        >
                                            <Plus aria-hidden />
                                        </Link>
                                    </Button>
                                }
                            >
                                {stats.last_visit_at && (
                                    <p className="text-muted-foreground text-xs">
                                        Dernière visite le{' '}
                                        {visitDate.format(
                                            new Date(stats.last_visit_at),
                                        )}
                                        .
                                    </p>
                                )}
                                {properties.length > 0 ? (
                                    <ul role="list" className="grid gap-2">
                                        {properties.map((property) => (
                                            <li
                                                key={property.uuid}
                                                className="bg-sidebar flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                                            >
                                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                                    <PropertyThumb
                                                        photo={
                                                            property.photos[0]
                                                        }
                                                        label={property.label}
                                                        className="size-10"
                                                    />
                                                    <div className="grid min-w-0 gap-0.5">
                                                        <Link
                                                            href={propertyShow({
                                                                property:
                                                                    property.uuid,
                                                            })}
                                                            className="truncate font-medium underline-offset-4 hover:underline"
                                                        >
                                                            {property.label}
                                                        </Link>
                                                        <span className="text-muted-foreground truncate text-xs">
                                                            {formatAddress(
                                                                property,
                                                            ) ?? '—'}
                                                            {property.rent_cents !==
                                                                null &&
                                                                ` · ${formatMoney(property.rent_cents, property.currency)} / mois`}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Badge
                                                    variant="secondary"
                                                    className="tabular-nums"
                                                >
                                                    {property.visits_count}{' '}
                                                    visite(s)
                                                </Badge>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-muted-foreground text-sm">
                                        Aucun bien rattaché pour l’instant. Un
                                        propriétaire peut en détenir plusieurs.
                                    </p>
                                )}
                            </Fold>
                        </div>
                    </div>
                </div>
            </div>
            <OwnerDialog
                open={editing}
                onOpenChange={setEditing}
                kinds={kinds}
                owner={owner}
            />
        </>
    );
}

OwnerShow.layout = {
    breadcrumbs: [
        { title: 'Propriétaires', href: ownersIndex() },
        { title: 'Biens et propriétaires', href: ownersIndex() },
        { title: 'Fiche', href: '#' },
    ],
};
