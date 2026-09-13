import { Head, Link } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { AddressMapButton } from '@/components/address-map-dialog';
import { OwnerDialog } from '@/components/owners/owner-dialog';
import { formatAddress } from '@/components/real-estate/columns';
import {
    DetailHeader,
    DetailSection,
    missingValue,
} from '@/components/real-estate/detail-header';
import { OwnerKindBadge } from '@/components/owners/owner-kind-badge';
import { DirectoryRelationCard } from '@/components/real-estate/directory-relation-card';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/format';
import {
    contact as ownerContact,
    destroy as ownerDestroy,
    index as ownersIndex,
} from '@/routes/owners';
import { show as leadShow } from '@/routes/leads';
import {
    create as propertyCreate,
    show as propertyShow,
} from '@/routes/properties';
import type { Owner, OwnerKindOption, OwnerParcStats, Property } from '@/types';
import { parisFormat } from '@/lib/datetime';

type Props = {
    /** Carte statique de l'adresse, null sans clé Maps Static dédiée. */
    mapUrl?: string | null;
    owner: Owner;
    /** Biens de l'annuaire rattachés à ce propriétaire. */
    properties: Property[];
    /** État du parc en trois chiffres, ce que la liste ne dit pas. */
    stats: OwnerParcStats;
    kinds: OwnerKindOption[];
};

const visitDate = parisFormat({
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

/** Fiche d'un propriétaire de l'annuaire : coordonnées, biens détenus, notes. */
export default function OwnerShow({
    owner,
    properties,
    stats,
    kinds,
    mapUrl = null,
}: Props) {
    const [editing, setEditing] = useState(false);
    const address = formatAddress(owner);
    const phoneDigits = owner.phone?.replace(/\s+/g, '') ?? '';

    return (
        <>
            <Head title={`Propriétaire ${owner.name}`} />
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-10">
                <DetailHeader
                    name={owner.name}
                    subtitle={
                        <>
                            <OwnerKindBadge
                                kind={owner.kind}
                                label={owner.kind_label}
                            />
                            {owner.contact_name && (
                                <span>{owner.contact_name}</span>
                            )}
                        </>
                    }
                    creator={owner.creator}
                    creatorAvatar={owner.creator_avatar}
                    createdAt={owner.created_at}
                    onEdit={() => setEditing(true)}
                    deleteUrl={ownerDestroy({ owner: owner.uuid }).url}
                    deleteTitle={`Supprimer le propriétaire ${owner.name} ?`}
                    deleteDescription="Sa fiche sera effacée ; ses biens sont conservés, sans propriétaire. Cette action est irréversible."
                />

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="flex flex-col gap-6">
                        <DetailSection
                            title="Coordonnées"
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
                            <div className="grid gap-4">
                                {mapUrl && (
                                    <img
                                        src={mapUrl}
                                        alt={`Carte de ${address ?? owner.name}`}
                                        loading="lazy"
                                        className="h-40 w-full rounded-lg border object-cover"
                                    />
                                )}
                                <dl className="divide-border grid divide-y text-sm">
                                    {[
                                        {
                                            label: 'Téléphone',
                                            value: owner.phone,
                                            href: owner.phone
                                                ? `tel:${phoneDigits}`
                                                : null,
                                        },
                                        {
                                            label: 'E-mail',
                                            value: owner.email,
                                            href: owner.email
                                                ? `mailto:${owner.email}`
                                                : null,
                                        },
                                        { label: 'Adresse', value: address },
                                    ].map((row) => (
                                        <div
                                            key={row.label}
                                            className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4"
                                        >
                                            <dt className="text-muted-foreground">
                                                {row.label}
                                            </dt>
                                            <dd className="break-words">
                                                {row.value ? (
                                                    row.href ? (
                                                        <a
                                                            href={row.href}
                                                            className="underline-offset-4 hover:underline"
                                                        >
                                                            {row.value}
                                                        </a>
                                                    ) : (
                                                        row.value
                                                    )
                                                ) : (
                                                    missingValue
                                                )}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        </DetailSection>

                        <DirectoryRelationCard
                            lastContactedAt={owner.last_contacted_at}
                            touchUrl={ownerContact({ owner: owner.uuid }).url}
                            notes={owner.notes}
                        />

                        {owner.lead && (
                            <DetailSection title="Lead propriétaire">
                                {/* La prospection reste le lead ; l'annuaire garde le lien. */}
                                <div className="grid gap-1 text-sm">
                                    <Link
                                        href={leadShow({
                                            lead: owner.lead.uuid,
                                        })}
                                        className="font-medium underline-offset-4 hover:underline"
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
                            </DetailSection>
                        )}
                    </div>
                    <aside className="grid h-fit content-start gap-6 lg:sticky lg:top-6">
                        <DetailSection
                            title="Biens"
                            count={properties.length}
                            action={
                                <Button variant="outline" size="sm" asChild>
                                    <Link
                                        href={propertyCreate({
                                            query: { owner: owner.uuid },
                                        })}
                                    >
                                        <Plus />
                                        Ajouter un bien
                                    </Link>
                                </Button>
                            }
                        >
                            {properties.length > 0 && (
                                <dl className="grid grid-cols-3 divide-x rounded-lg border text-center">
                                    {[
                                        {
                                            label: 'Disponibles',
                                            value: String(stats.open),
                                        },
                                        {
                                            label: 'Loués',
                                            value: String(stats.rented),
                                        },
                                        {
                                            label: 'Loyers cumulés',
                                            value:
                                                stats.rent_cents > 0
                                                    ? formatMoney(
                                                          stats.rent_cents,
                                                          'EUR',
                                                      )
                                                    : '—',
                                        },
                                    ].map((figure) => (
                                        <div
                                            key={figure.label}
                                            className="grid gap-0.5 px-2 py-3"
                                        >
                                            <dt className="text-muted-foreground text-xs">
                                                {figure.label}
                                            </dt>
                                            <dd className="text-sm font-medium tabular-nums">
                                                {figure.value}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            )}
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
                                <ul
                                    role="list"
                                    className="divide-border grid divide-y text-sm"
                                >
                                    {properties.map((property) => (
                                        <li
                                            key={property.uuid}
                                            className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                                        >
                                            <div className="grid min-w-0 gap-0.5">
                                                <Link
                                                    href={propertyShow({
                                                        property: property.uuid,
                                                    })}
                                                    className="truncate font-medium underline-offset-4 hover:underline"
                                                >
                                                    {property.label}
                                                </Link>
                                                <span className="text-muted-foreground truncate text-xs">
                                                    {formatAddress(property) ??
                                                        '—'}
                                                    {property.rent_cents !==
                                                        null &&
                                                        ` · ${formatMoney(property.rent_cents, property.currency)} / mois`}
                                                </span>
                                            </div>
                                            <span className="text-muted-foreground text-xs tabular-nums">
                                                {property.visits_count}{' '}
                                                visite(s)
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted-foreground text-sm">
                                    Aucun bien rattaché pour l’instant. Un
                                    propriétaire peut en détenir plusieurs.
                                </p>
                            )}
                        </DetailSection>
                    </aside>
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
