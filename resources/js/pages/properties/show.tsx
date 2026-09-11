import { TransitStopItem } from '@/components/properties/transit-stop-item';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    Building2,
    CalendarClock,
    ExternalLink,
    FileDown,
    FolderOpen,
    Handshake,
    KeyRound,
    Mail,
    Phone,
} from 'lucide-react';
import { PhotoGallery } from '@/components/photo-gallery';
import { PropertyStatusMenu } from '@/components/properties/property-status-menu';
import { formatAddress } from '@/components/real-estate/columns';
import { downloadPropertyPdf } from '@/lib/download-property-pdf';
import {
    DetailHeader,
    DetailRow,
    missingValue,
} from '@/components/real-estate/detail-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VisitStatusBadge } from '@/components/visits/visit-status-badge';
import { formatMoney } from '@/lib/format';
import { show as agentShow } from '@/routes/agents';
import {
    PropertyAssignmentBanner,
    PropertyAssignmentButton,
} from '@/components/properties/property-assignment';
import { show as clientShow } from '@/routes/clients';
import { show as ownerShow } from '@/routes/owners';
import { show as partnerShow } from '@/routes/partners';
import {
    cover as propertyCover,
    destroy as propertyDestroy,
    index as propertiesIndex,
    edit as propertyEdit,
} from '@/routes/properties';
import type {
    Owner,
    Property,
    PropertyClient,
    PropertyFormOptions,
    PropertyVisit,
} from '@/types';

const visitDateTime = new Intl.DateTimeFormat('fr-FR', {
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
    /** Dossiers clients auxquels le bien est attribué, le plus récent d'abord. */
    clients: PropertyClient[];
    visits: PropertyVisit[];
};

/** Fiche d'un bien de l'annuaire : caractéristiques, photos, propriétaire, agent, dossiers clients, visites. */
export default function PropertyShow({
    property,
    propertyStatuses,
    owner,
    clients,
    visits,
}: Props) {
    const address = formatAddress(property);
    const floor = property.floor_label;

    return (
        <>
            <Head title={`Bien ${property.label}`} />
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-10">
                <DetailHeader
                    name={property.label}
                    subtitle={
                        <>
                            {/* La disponibilité se change ici, sans passer par
                                le formulaire complet. */}
                            <PropertyStatusMenu
                                property={property}
                                statuses={propertyStatuses}
                            />
                            {address && <span>{address}</span>}
                            {property.district && (
                                <Badge variant="secondary">
                                    {property.district === 1
                                        ? '1er'
                                        : `${property.district}e`}
                                </Badge>
                            )}
                            {property.property_type_label && (
                                <Badge variant="secondary">
                                    {property.property_type_label}
                                </Badge>
                            )}
                        </>
                    }
                    creator={property.creator}
                    creatorAvatar={property.creator_avatar}
                    createdAt={property.created_at}
                    actions={
                        <Button
                            variant="outline"
                            onClick={() =>
                                downloadPropertyPdf(
                                    property.uuid,
                                    property.label,
                                )
                            }
                        >
                            <FileDown />
                            Fiche PDF
                        </Button>
                    }
                    onEdit={() =>
                        router.visit(
                            propertyEdit({ property: property.uuid }).url,
                        )
                    }
                    deleteUrl={propertyDestroy({ property: property.uuid }).url}
                    deleteTitle={`Supprimer le bien ${property.label} ?`}
                    deleteDescription="Sa fiche et ses visites seront effacées. Cette action est irréversible."
                >
                    <div className="grid gap-4">
                        <h2 className="text-muted-foreground text-xs tracking-wide uppercase">
                            En un coup d’œil
                        </h2>
                        <dl className="grid gap-4 sm:grid-cols-4">
                            {[
                                {
                                    label: 'Loyer',
                                    value:
                                        property.rent_cents !== null
                                            ? `${formatMoney(property.rent_cents, property.currency)} / mois`
                                            : null,
                                },
                                {
                                    label: 'Surface',
                                    value:
                                        property.surface_m2 !== null
                                            ? `${property.surface_m2} m²`
                                            : null,
                                },
                                {
                                    label: 'Pièces',
                                    value:
                                        property.rooms !== null
                                            ? String(property.rooms)
                                            : null,
                                },
                                { label: 'Étage', value: floor },
                            ].map((row) => (
                                <div
                                    key={row.label}
                                    className="grid min-w-0 gap-1"
                                >
                                    <dt className="text-muted-foreground text-sm">
                                        {row.label}
                                    </dt>
                                    <dd className="min-w-0 font-medium break-words">
                                        {row.value ?? missingValue}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </DetailHeader>

                {/* Bien attribué : le bandeau vert passe avant tout le reste. */}
                <div className="grid gap-4 pb-6 empty:hidden">
                    <PropertyAssignmentBanner property={property} />
                </div>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="flex flex-col gap-4">
                        <section
                            aria-label="Caractéristiques"
                            className="bg-sidebar grid gap-3 rounded-xl border p-4"
                        >
                            <h2 className="text-base font-medium">
                                Caractéristiques
                            </h2>
                            {/* Contenu sur fond blanc, comme les autres sections. */}
                            <div className="bg-background rounded-lg border p-4">
                                <dl className="grid gap-4 sm:grid-cols-2">
                                    <DetailRow label="Statut">
                                        {property.status_label}
                                    </DetailRow>
                                    <DetailRow label="Type">
                                        {property.property_type_label ??
                                            missingValue}
                                    </DetailRow>
                                    <DetailRow label="Meublé">
                                        {property.furnished_label ??
                                            missingValue}
                                    </DetailRow>
                                    <DetailRow label="Pièces">
                                        {property.rooms ?? missingValue}
                                    </DetailRow>
                                    <DetailRow label="Chambres">
                                        {property.bedrooms ?? missingValue}
                                    </DetailRow>
                                    <DetailRow label="Salles de bain">
                                        {property.bathrooms ?? missingValue}
                                    </DetailRow>
                                    <DetailRow label="Surface">
                                        {property.surface_m2 !== null
                                            ? `${property.surface_m2} m²`
                                            : missingValue}
                                    </DetailRow>
                                    <DetailRow label="Étage">
                                        {floor ?? missingValue}
                                    </DetailRow>
                                    <DetailRow label="Étages de l’immeuble">
                                        {property.building_floors ??
                                            missingValue}
                                    </DetailRow>
                                    <DetailRow label="Orientation">
                                        {property.orientation_labels.length > 0
                                            ? property.orientation_labels.join(
                                                  ', ',
                                              )
                                            : missingValue}
                                    </DetailRow>
                                    <DetailRow label="Bail">
                                        {property.lease_type_label ??
                                            missingValue}
                                    </DetailRow>
                                    <DetailRow
                                        label={
                                            property.charges_included
                                                ? 'Loyer charges comprises'
                                                : 'Loyer hors charges'
                                        }
                                    >
                                        {property.rent_cents !== null
                                            ? `${formatMoney(property.rent_cents, property.currency)} / mois`
                                            : missingValue}
                                    </DetailRow>
                                    <DetailRow
                                        label={
                                            property.charges_included
                                                ? 'Dont charges'
                                                : 'Charges'
                                        }
                                    >
                                        {property.charges_cents !== null
                                            ? `${formatMoney(property.charges_cents, property.currency)} / mois`
                                            : missingValue}
                                    </DetailRow>
                                    <DetailRow label="Dépôt de garantie">
                                        {property.deposit_cents !== null
                                            ? formatMoney(
                                                  property.deposit_cents,
                                                  property.currency,
                                              )
                                            : missingValue}
                                    </DetailRow>
                                    <DetailRow label="Annonce">
                                        {property.listing_url ? (
                                            <a
                                                href={property.listing_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                                            >
                                                Ouvrir l’annonce
                                                <ExternalLink
                                                    className="size-3.5"
                                                    aria-hidden
                                                />
                                            </a>
                                        ) : (
                                            missingValue
                                        )}
                                    </DetailRow>
                                </dl>
                            </div>
                        </section>
                        {property.amenity_labels.length > 0 && (
                            <section
                                aria-label="Équipements"
                                className="bg-sidebar grid gap-3 rounded-xl border p-4"
                            >
                                <header className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-base font-medium">
                                        Équipements
                                    </h2>
                                    <Badge variant="secondary">
                                        {property.amenity_labels.length}
                                    </Badge>
                                </header>
                                <ul
                                    role="list"
                                    className="bg-background flex flex-wrap gap-1.5 rounded-lg border p-4"
                                >
                                    {property.amenity_labels.map((amenity) => (
                                        <li key={amenity}>
                                            <Badge
                                                variant="outline"
                                                className="font-normal"
                                            >
                                                {amenity}
                                            </Badge>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {property.transit.length > 0 && (
                            <section
                                aria-label="Transports"
                                className="bg-sidebar grid gap-3 rounded-xl border p-4"
                            >
                                <header className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-base font-medium">
                                        Transports
                                    </h2>
                                    <Badge variant="secondary">
                                        {property.transit.length}
                                    </Badge>
                                </header>
                                <ul
                                    role="list"
                                    className="bg-background grid gap-2 rounded-lg border p-4"
                                >
                                    {property.transit.map((stop, index) => (
                                        <li
                                            key={`${stop.kind}-${stop.name}-${index}`}
                                        >
                                            <TransitStopItem stop={stop} />
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                        <section
                            aria-label="Photos"
                            className="bg-sidebar grid gap-3 rounded-xl border p-4"
                        >
                            <h2 className="text-base font-medium">Photos</h2>
                            {/* Contenu sur fond blanc, comme les autres sections. */}
                            <div className="bg-background rounded-lg border p-4">
                                {property.photos.length > 0 ? (
                                    <PhotoGallery
                                        photos={property.photos}
                                        label={property.label}
                                        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
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
                                ) : (
                                    <p className="text-muted-foreground text-sm">
                                        Aucune photo.
                                    </p>
                                )}
                            </div>
                        </section>
                        <section
                            aria-label="Notes"
                            className="bg-sidebar grid gap-3 rounded-xl border p-4"
                        >
                            <h2 className="text-base font-medium">Notes</h2>
                            {/* Contenu sur fond blanc, comme les autres sections. */}
                            <div className="bg-background rounded-lg border p-4">
                                {property.notes ? (
                                    <p className="text-sm/6 whitespace-pre-line">
                                        {property.notes}
                                    </p>
                                ) : (
                                    <p className="text-muted-foreground text-sm">
                                        Aucune note.
                                    </p>
                                )}
                            </div>
                        </section>
                    </div>
                    <aside className="grid h-fit content-start gap-6 lg:sticky lg:top-6">
                        <section
                            aria-label="Propriétaire"
                            className="bg-sidebar grid gap-3 rounded-xl border p-4"
                        >
                            <h2 className="flex items-center gap-2 text-base font-medium">
                                <KeyRound className="size-4" aria-hidden />
                                Propriétaire
                            </h2>
                            {/* Contenu sur fond blanc, comme les autres sections. */}
                            <div className="bg-background grid gap-3 rounded-lg border p-4">
                                {owner ? (
                                    <>
                                        <div className="grid gap-1 text-sm">
                                            <Link
                                                href={ownerShow({
                                                    owner: owner.uuid,
                                                })}
                                                className="font-medium underline-offset-4 hover:underline"
                                            >
                                                {owner.name}
                                            </Link>
                                            {owner.company && (
                                                <span className="text-muted-foreground">
                                                    {owner.company}
                                                </span>
                                            )}
                                            <span className="text-muted-foreground text-xs">
                                                {owner.kind_label}
                                            </span>
                                        </div>
                                        {(owner.phone || owner.email) && (
                                            <div className="flex flex-wrap gap-2 border-t pt-3">
                                                {owner.phone && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        asChild
                                                    >
                                                        <a
                                                            href={`tel:${owner.phone.replace(/\s+/g, '')}`}
                                                        >
                                                            <Phone
                                                                aria-hidden
                                                            />
                                                            {owner.phone}
                                                        </a>
                                                    </Button>
                                                )}
                                                {owner.email && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        asChild
                                                    >
                                                        <a
                                                            href={`mailto:${owner.email}`}
                                                        >
                                                            <Mail aria-hidden />
                                                            {owner.email}
                                                        </a>
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            asChild
                                        >
                                            <Link
                                                href={ownerShow({
                                                    owner: owner.uuid,
                                                })}
                                            >
                                                Voir la fiche du propriétaire
                                                <ArrowRight aria-hidden />
                                            </Link>
                                        </Button>
                                    </>
                                ) : (
                                    <p className="text-muted-foreground text-sm">
                                        Aucun propriétaire rattaché.
                                        Choisissez-le en modifiant le bien.
                                    </p>
                                )}
                            </div>
                        </section>

                        <section
                            aria-label="Agent"
                            className="bg-sidebar grid gap-3 rounded-xl border p-4"
                        >
                            <h2 className="flex items-center gap-2 text-base font-medium">
                                <Building2 className="size-4" aria-hidden />
                                Agent
                            </h2>
                            {/* Contenu sur fond blanc, comme les autres sections. */}
                            <div className="bg-background grid gap-3 rounded-lg border p-4">
                                {property.agent ? (
                                    <div className="grid gap-1 text-sm">
                                        <Link
                                            href={agentShow({
                                                agent: property.agent.uuid,
                                            })}
                                            className="font-medium underline-offset-4 hover:underline"
                                        >
                                            {property.agent.name}
                                        </Link>
                                        {property.agent.agency && (
                                            <span className="text-muted-foreground">
                                                {property.agent.agency}
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-sm">
                                        Aucun agent rattaché.
                                    </p>
                                )}
                            </div>
                        </section>

                        {property.partner && (
                            <section
                                aria-label="Partenaire"
                                className="bg-sidebar grid gap-3 rounded-xl border p-4"
                            >
                                <h2 className="flex items-center gap-2 text-base font-medium">
                                    <Handshake className="size-4" aria-hidden />
                                    Partenaire
                                </h2>
                                {/* Contenu sur fond blanc, comme les autres sections. */}
                                <div className="bg-background grid gap-1 rounded-lg border p-4 text-sm">
                                    <Link
                                        href={partnerShow({
                                            partner: property.partner.uuid,
                                        })}
                                        className="font-medium underline-offset-4 hover:underline"
                                    >
                                        {property.partner.name}
                                    </Link>
                                    <span className="text-muted-foreground text-xs">
                                        {property.partner.type}
                                    </span>
                                </div>
                            </section>
                        )}

                        <section
                            aria-label="Dossiers clients"
                            className="bg-sidebar grid gap-3 rounded-xl border p-4"
                        >
                            <header className="flex flex-wrap items-center justify-between gap-2">
                                <h2 className="flex items-center gap-2 text-base font-medium">
                                    <FolderOpen
                                        className="size-4"
                                        aria-hidden
                                    />
                                    Dossiers clients
                                    <Badge
                                        variant="secondary"
                                        className="tabular-nums"
                                    >
                                        {clients.length}
                                    </Badge>
                                </h2>
                                {/* L'attribution se choisit parmi les dossiers rattachés. */}
                                <PropertyAssignmentButton
                                    property={property}
                                    clients={clients}
                                />
                            </header>
                            {clients.length > 0 ? (
                                <ul role="list" className="grid gap-2 text-sm">
                                    {clients.map((client) => (
                                        <li
                                            key={client.uuid}
                                            className="bg-background grid gap-0.5 rounded-lg border px-3 py-2"
                                        >
                                            <Link
                                                href={clientShow({
                                                    lead: client.uuid,
                                                })}
                                                className="truncate font-medium underline-offset-4 hover:underline"
                                            >
                                                {client.name}
                                            </Link>
                                            {client.reference && (
                                                <span className="text-muted-foreground text-xs">
                                                    {client.reference}
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted-foreground text-sm">
                                    Ce bien n'est attribué à aucun dossier
                                    client. Rattachez-le depuis l'onglet « Biens
                                    » d'un dossier.
                                </p>
                            )}
                        </section>

                        <section
                            aria-label="Visites"
                            className="bg-sidebar grid gap-3 rounded-xl border p-4"
                        >
                            <h2 className="flex items-center gap-2 text-base font-medium">
                                <CalendarClock className="size-4" aria-hidden />
                                Visites
                                <Badge
                                    variant="secondary"
                                    className="tabular-nums"
                                >
                                    {visits.length}
                                </Badge>
                            </h2>
                            {visits.length > 0 ? (
                                <ul role="list" className="grid gap-2 text-sm">
                                    {visits.map((visit) => (
                                        <li
                                            key={visit.uuid}
                                            className="bg-background flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
                                        >
                                            <div className="grid min-w-0 gap-0.5">
                                                <Link
                                                    href={clientShow({
                                                        lead: visit.client.uuid,
                                                    })}
                                                    className="truncate font-medium underline-offset-4 hover:underline"
                                                >
                                                    {visit.client.name}
                                                </Link>
                                                <span className="text-muted-foreground text-xs">
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
                        </section>
                    </aside>
                </div>
            </div>
        </>
    );
}

PropertyShow.layout = {
    breadcrumbs: [
        { title: 'Réseau', href: propertiesIndex() },
        { title: 'Biens', href: propertiesIndex() },
        { title: 'Fiche', href: '#' },
    ],
};
