import { Head, Link } from '@inertiajs/react';
import {
    Building2,
    CalendarClock,
    ExternalLink,
    MapPin,
    Pencil,
    UserRound,
} from 'lucide-react';
import { OfferBadge } from '@/components/clients/offer-badge';
import { CreatedBy } from '@/components/created-by';
import { PhotoGallery } from '@/components/photo-gallery';
import {
    PropertyFollowUp,
    PropertyOutcomeMenu,
} from '@/components/clients/property-outcome';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VisitReportDialog } from '@/components/visits/visit-report-dialog';
import { VisitRowActions } from '@/components/visits/visit-row-actions';
import { VisitStatusBadge } from '@/components/visits/visit-status-badge';
import { formatMoney } from '@/lib/format';
import { visitAddress } from '@/lib/visits';
import { show as agentShow } from '@/routes/agents';
import {
    index as clientsIndex,
    visits as clientsVisits,
} from '@/routes/clients';
import { show as clientShow } from '@/routes/clients';
import { edit as visitEdit } from '@/routes/clients/visits';
import { show as ownerShow } from '@/routes/owners';
import { show as propertyShow } from '@/routes/properties';
import type { Visit, VisitDetail, VisitOutcome } from '@/types';
import { useState } from 'react';
import { parisFormat } from '@/lib/datetime';

const dateTime = parisFormat({
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

type Props = {
    visit: VisitDetail;
    /** Les autres visites du même client : seul leur nombre est affiché. */
    otherVisits?: Visit[];
    /** Ce que devient le bien visité pour ce client, une fois le compte rendu écrit. */
    outcome?: VisitOutcome | null;
};

/** Carte de section de la fiche : intitulé en capitales puis contenu. */
function Section({
    title,
    action,
    children,
}: {
    title: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section
            aria-label={title}
            className="bg-card grid gap-3 rounded-xl border p-4"
        >
            <header className="flex items-center justify-between gap-2 border-b pb-3">
                <h2 className="text-muted-foreground text-xs tracking-wide uppercase">
                    {title}
                </h2>
                {action}
            </header>
            {children}
        </section>
    );
}

/** Couple libellé / valeur. */
function Row({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="grid min-w-0 gap-1">
            <dt className="text-muted-foreground text-sm">{label}</dt>
            <dd className="min-w-0 font-medium [overflow-wrap:anywhere]">
                {children}
            </dd>
        </div>
    );
}

const missing = (
    <span className="text-muted-foreground font-normal">Non renseigné</span>
);

/**
 * Fiche d'une visite : créneau, client, bien visité avec ses photos, agent et
 * membre présent, compte rendu et commentaires internes.
 */
export default function VisitShow({
    visit,
    otherVisits = [],
    outcome = null,
}: Props) {
    const [reporting, setReporting] = useState(false);
    const { property } = visit;
    /** Les visites du client, celle-ci comprise. */
    const totalVisits = otherVisits.length + 1;
    const address = visitAddress(visit);
    const features = [
        property.property_type_label,
        property.surface_m2 ? `${property.surface_m2} m²` : null,
        property.rooms ? `${property.rooms} pièce(s)` : null,
        property.floor_label,
        property.furnished_label,
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <>
            <Head title={`Visite de ${visit.client.name}`} />
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-10">
                <div className="flex flex-col gap-4 pt-8 pb-6">
                    <p className="text-muted-foreground text-xs">
                        <CreatedBy
                            name={visit.creator}
                            avatar={visit.creator_avatar}
                            date={visit.created_at}
                            verb="planifiée par"
                        />
                    </p>
                    <div className="bg-muted/40 flex flex-wrap items-center gap-4 rounded-xl border p-4">
                        <span
                            aria-hidden
                            className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-lg"
                        >
                            <CalendarClock className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <h1 className="truncate text-base font-semibold">
                                {dateTime.format(new Date(visit.scheduled_at))}
                            </h1>
                            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                                <Link
                                    href={clientShow({
                                        lead: visit.client.uuid,
                                    })}
                                    className="hover:text-foreground font-medium underline-offset-4 hover:underline"
                                >
                                    {visit.client.name}
                                </Link>
                                {visit.client.reference && (
                                    <span>{visit.client.reference}</span>
                                )}
                                <VisitStatusBadge
                                    status={visit.status}
                                    label={visit.status_label}
                                />
                                {visit.report_due && (
                                    <Badge
                                        data-report="due"
                                        className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                                    >
                                        Compte rendu à rédiger
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" asChild>
                                <Link href={visitEdit({ visit: visit.uuid })}>
                                    <Pencil />
                                    Modifier
                                </Link>
                            </Button>
                            <VisitRowActions visit={visit} />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    <div className="flex flex-col gap-4">
                        <Section
                            title="Bien à visiter"
                            action={
                                <Link
                                    href={propertyShow({
                                        property: property.uuid,
                                    })}
                                    className="text-sm underline-offset-4 hover:underline"
                                >
                                    Voir le bien
                                </Link>
                            }
                        >
                            {property.photos.length > 0 && (
                                /* Cliquer ouvre le diaporama plein écran,
                                   comme sur la fiche du bien. */
                                <PhotoGallery
                                    photos={property.photos}
                                    label={property.label}
                                    className="grid grid-cols-3 gap-2"
                                />
                            )}
                            <dl className="grid gap-4 sm:grid-cols-2">
                                <Row label="Bien">
                                    <Link
                                        href={propertyShow({
                                            property: property.uuid,
                                        })}
                                        className="underline-offset-4 hover:underline"
                                    >
                                        {property.label}
                                    </Link>
                                </Row>
                                <Row label="Adresse">
                                    <span className="flex items-start gap-1.5">
                                        <MapPin
                                            className="text-muted-foreground mt-1 size-3.5 shrink-0"
                                            aria-hidden
                                        />
                                        {address || missing}
                                    </span>
                                </Row>
                                <Row label="Loyer">
                                    {property.rent_cents === null ? (
                                        missing
                                    ) : (
                                        <>
                                            {formatMoney(
                                                property.rent_cents,
                                                property.currency,
                                            )}{' '}
                                            / mois
                                            {property.charges_cents !== null &&
                                                property.charges_cents > 0 &&
                                                ` + ${formatMoney(property.charges_cents, property.currency)} de charges`}
                                        </>
                                    )}
                                </Row>
                                <Row label="Caractéristiques">
                                    {features || missing}
                                </Row>
                                <Row label="Propriétaire">
                                    {property.owner ? (
                                        <Link
                                            href={ownerShow({
                                                owner: property.owner.uuid,
                                            })}
                                            className="underline-offset-4 hover:underline"
                                        >
                                            {property.owner.name}
                                        </Link>
                                    ) : (
                                        missing
                                    )}
                                </Row>
                                <Row label="Annonce">
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
                                        missing
                                    )}
                                </Row>
                            </dl>
                        </Section>

                        <Section
                            title="Compte rendu"
                            action={
                                visit.can_report && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setReporting(true)}
                                    >
                                        {visit.report ? 'Modifier' : 'Rédiger'}
                                    </Button>
                                )
                            }
                        >
                            {visit.report ? (
                                <div className="grid gap-3">
                                    <p className="text-sm whitespace-pre-line">
                                        {visit.report}
                                    </p>
                                    <p className="text-muted-foreground text-xs">
                                        {visit.report_author
                                            ? `Rédigé par ${visit.report_author}`
                                            : 'Rédigé'}
                                        {visit.report_submitted_at &&
                                            ` le ${dateTime.format(new Date(visit.report_submitted_at))}`}
                                    </p>
                                    {visit.report_photos.length > 0 && (
                                        <PhotoGallery
                                            photos={visit.report_photos}
                                            label={`compte rendu de la visite de ${visit.client.name}`}
                                            className="grid grid-cols-3 gap-2 sm:grid-cols-4"
                                        />
                                    )}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-sm">
                                    {visit.status === 'cancelled'
                                        ? 'Visite annulée : aucun compte rendu attendu.'
                                        : visit.report_due
                                          ? 'La visite est passée : le compte rendu reste à écrire.'
                                          : 'Le compte rendu s’écrira après la visite.'}
                                </p>
                            )}
                        </Section>

                        {outcome && visit.report && (
                            <Section
                                title="Suite de la visite"
                                action={
                                    <PropertyOutcomeMenu
                                        clientUuid={visit.client.uuid}
                                        propertyUuid={property.uuid}
                                        propertyLabel={property.label}
                                        status={outcome.status}
                                        options={outcome.options}
                                    />
                                }
                            >
                                <PropertyFollowUp outcome={outcome} />
                            </Section>
                        )}

                        <Section title="Commentaires internes">
                            {visit.notes ? (
                                <p className="text-sm whitespace-pre-line">
                                    {visit.notes}
                                </p>
                            ) : (
                                <p className="text-muted-foreground text-sm">
                                    Aucun commentaire.
                                </p>
                            )}
                        </Section>
                    </div>

                    <div className="flex flex-col gap-4">
                        <Section title="Qui est présent">
                            <dl className="grid gap-4">
                                {/* Visite autonome : le client y va seul, il
                                    n'y a pas de membre à annoncer. */}
                                {visit.mode !== 'client_alone' && (
                                    <Row label="Membre de l’équipe">
                                        {visit.assignee ? (
                                            <span className="flex items-center gap-2">
                                                <UserRound
                                                    className="text-muted-foreground size-3.5"
                                                    aria-hidden
                                                />
                                                {visit.assignee.name}
                                            </span>
                                        ) : (
                                            missing
                                        )}
                                    </Row>
                                )}
                                <Row label="Agent immobilier">
                                    {visit.agent ? (
                                        <Link
                                            href={agentShow({
                                                agent: visit.agent.uuid,
                                            })}
                                            className="flex items-center gap-2 underline-offset-4 hover:underline"
                                        >
                                            <Building2
                                                className="text-muted-foreground size-3.5"
                                                aria-hidden
                                            />
                                            {visit.agent.name}
                                            {visit.agent.agency &&
                                                ` · ${visit.agent.agency}`}
                                        </Link>
                                    ) : (
                                        missing
                                    )}
                                </Row>
                                <Row label="Dossier client">
                                    {/* La formule dit qui visite : elle se lit
                                        à côté du nom, pas ailleurs. */}
                                    <span className="grid gap-1">
                                        <span className="flex flex-wrap items-center gap-2">
                                            <Link
                                                href={clientShow({
                                                    lead: visit.client.uuid,
                                                })}
                                                className="underline-offset-4 hover:underline"
                                            >
                                                {visit.client.name}
                                            </Link>
                                            <OfferBadge
                                                offer={visit.client.offer}
                                                label={visit.client.offer_label}
                                            />
                                        </span>
                                        {/* Le nombre de visites suffit : la
                                            liste des autres visites répétait
                                            ce que le dossier montre déjà. */}
                                        <Link
                                            href={clientShow({
                                                lead: visit.client.uuid,
                                            })}
                                            aria-label={`Voir les visites de ${visit.client.name}`}
                                            className="text-muted-foreground text-xs tabular-nums underline-offset-4 hover:underline"
                                        >
                                            {totalVisits} visite
                                            {totalVisits > 1 ? 's' : ''} pour ce
                                            client
                                        </Link>
                                    </span>
                                </Row>
                            </dl>
                        </Section>
                    </div>
                </div>
            </div>

            <VisitReportDialog
                visit={visit}
                open={reporting}
                onOpenChange={setReporting}
            />
        </>
    );
}

VisitShow.layout = {
    breadcrumbs: [
        { title: 'Clients', href: clientsIndex() },
        { title: 'Visites', href: clientsVisits() },
        { title: 'Visite', href: clientsVisits() },
    ],
};
