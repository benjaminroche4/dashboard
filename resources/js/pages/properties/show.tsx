import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    Building2,
    CalendarClock,
    ExternalLink,
    KeyRound,
    Mail,
    Phone,
} from 'lucide-react';
import { formatAddress } from '@/components/real-estate/columns';
import {
    DetailHeader,
    DetailRow,
    DetailSection,
    missingValue,
} from '@/components/real-estate/detail-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VisitStatusBadge } from '@/components/visits/visit-status-badge';
import { formatMoney } from '@/lib/format';
import { show as agentShow } from '@/routes/agents';
import { show as clientShow } from '@/routes/clients';
import { show as ownerShow } from '@/routes/owners';
import {
    destroy as propertyDestroy,
    index as propertiesIndex,
    edit as propertyEdit,
} from '@/routes/properties';
import type {
    Owner,
    Property,
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
    visits: PropertyVisit[];
};

/** Étage lisible : « Rez-de-chaussée », « 1er », « 3e ». */
export function describeFloor(floor: number | null): string | null {
    if (floor === null) {
        return null;
    }

    if (floor === 0) {
        return 'Rez-de-chaussée';
    }

    return floor === 1 ? '1er étage' : `${floor}e étage`;
}

/** Fiche d'un bien de l'annuaire : caractéristiques, photos, propriétaire, agent, visites. */
export default function PropertyShow({ property, owner, visits }: Props) {
    const address = formatAddress(property);
    const floor = describeFloor(property.floor);

    return (
        <>
            <Head title={`Bien ${property.label}`} />
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-10">
                <DetailHeader
                    name={property.label}
                    subtitle={
                        <>
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
                    onEdit={() =>
                        router.visit(
                            propertyEdit({ property: property.uuid }).url,
                        )
                    }
                    deleteUrl={propertyDestroy({ property: property.uuid }).url}
                    deleteTitle={`Supprimer le bien ${property.label} ?`}
                    deleteDescription="Sa fiche et ses visites seront effacées. Cette action est irréversible."
                    backHref={propertiesIndex().url}
                    backLabel="Tous les biens"
                />

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    <div className="divide-y">
                        <DetailSection title="Caractéristiques">
                            <dl className="grid gap-3">
                                <DetailRow label="Type">
                                    {property.property_type_label ??
                                        missingValue}
                                </DetailRow>
                                <DetailRow label="Meublé">
                                    {property.furnished_label ?? missingValue}
                                </DetailRow>
                                <DetailRow label="Pièces">
                                    {property.rooms ?? missingValue}
                                </DetailRow>
                                <DetailRow label="Surface">
                                    {property.surface_m2 !== null
                                        ? `${property.surface_m2} m²`
                                        : missingValue}
                                </DetailRow>
                                <DetailRow label="Étage">
                                    {floor ?? missingValue}
                                </DetailRow>
                                <DetailRow label="Bail">
                                    {property.lease_type_label ?? missingValue}
                                </DetailRow>
                                <DetailRow label="Loyer hors charges">
                                    {property.rent_cents !== null
                                        ? `${formatMoney(property.rent_cents, property.currency)} / mois`
                                        : missingValue}
                                </DetailRow>
                                <DetailRow label="Charges">
                                    {property.charges_cents !== null
                                        ? `${formatMoney(property.charges_cents, property.currency)} / mois`
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
                        </DetailSection>
                        <DetailSection title="Photos">
                            {property.photos.length > 0 ? (
                                <ul
                                    role="list"
                                    className="grid grid-cols-2 gap-3 sm:grid-cols-3"
                                >
                                    {property.photos.map((url, index) => (
                                        <li key={url}>
                                            <a
                                                href={url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="block overflow-hidden rounded-lg border"
                                            >
                                                <img
                                                    src={url}
                                                    alt={`Photo ${index + 1} du bien ${property.label}`}
                                                    className="aspect-[4/3] w-full object-cover"
                                                />
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted-foreground text-sm">
                                    Aucune photo.
                                </p>
                            )}
                        </DetailSection>
                        <DetailSection title="Notes">
                            {property.notes ? (
                                <p className="text-sm/6 whitespace-pre-line">
                                    {property.notes}
                                </p>
                            ) : (
                                <p className="text-muted-foreground text-sm">
                                    Aucune note.
                                </p>
                            )}
                        </DetailSection>
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
                                            {owner.status_label}
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
                                                        <Phone aria-hidden />
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
                                    Aucun propriétaire rattaché. Choisissez-le
                                    en modifiant le bien.
                                </p>
                            )}
                        </section>

                        <section
                            aria-label="Agent"
                            className="bg-sidebar grid gap-3 rounded-xl border p-4"
                        >
                            <h2 className="flex items-center gap-2 text-base font-medium">
                                <Building2 className="size-4" aria-hidden />
                                Agent
                            </h2>
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
