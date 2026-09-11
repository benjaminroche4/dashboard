import { Head, Link } from '@inertiajs/react';
import {
    Building2,
    CalendarClock,
    ExternalLink,
    Home,
    MapPin,
    Pencil,
    UserRound,
} from 'lucide-react';
import { CreatedBy } from '@/components/created-by';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VisitDaySection } from '@/components/visits/visit-day-section';
import { VisitReportDialog } from '@/components/visits/visit-report-dialog';
import { VisitRowActions } from '@/components/visits/visit-row-actions';
import { VisitStatusBadge } from '@/components/visits/visit-status-badge';
import { formatMoney } from '@/lib/format';
import { groupVisitsByDay, visitAddress } from '@/lib/visits';
import { show as agentShow } from '@/routes/agents';
import {
    index as clientsIndex,
    visits as clientsVisits,
} from '@/routes/clients';
import { show as clientShow } from '@/routes/clients';
import { edit as visitEdit } from '@/routes/clients/visits';
import { show as ownerShow } from '@/routes/owners';
import { show as propertyShow } from '@/routes/properties';
import type { Visit, VisitDetail } from '@/types';
import { useState } from 'react';

const dateTime = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

type Props = {
    visit: VisitDetail;
    /** Les autres visites du même client, les plus récentes d'abord. */
    otherVisits?: Visit[];
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
export default function VisitShow({ visit, otherVisits = [] }: Props) {
    const [reporting, setReporting] = useState(false);
    const { property } = visit;
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
    const days = groupVisitsByDay(otherVisits);

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
                        {' · '}
                        <Link
                            href={clientsVisits()}
                            className="underline-offset-4 hover:underline"
                        >
                            Toutes les visites
                        </Link>
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
                                <ul
                                    role="list"
                                    className="grid grid-cols-3 gap-2"
                                >
                                    {property.photos
                                        .slice(0, 3)
                                        .map((photo, index) => (
                                            <li key={photo}>
                                                <img
                                                    src={photo}
                                                    alt={`Photo ${index + 1} du bien ${property.label}`}
                                                    loading="lazy"
                                                    className="aspect-[4/3] w-full rounded-lg border object-cover"
                                                />
                                            </li>
                                        ))}
                                </ul>
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
                                visit.status !== 'cancelled' && (
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
                                <div className="grid gap-2">
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
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-sm">
                                    {visit.report_due
                                        ? 'La visite est passée : le compte rendu reste à écrire.'
                                        : 'Aucun compte rendu pour le moment.'}
                                </p>
                            )}
                        </Section>

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
                                    <Link
                                        href={clientShow({
                                            lead: visit.client.uuid,
                                        })}
                                        className="underline-offset-4 hover:underline"
                                    >
                                        {visit.client.name}
                                    </Link>
                                </Row>
                            </dl>
                        </Section>

                        <Section title="Autres visites du client">
                            {days.length > 0 ? (
                                <div className="grid gap-4">
                                    {days.map((day) => (
                                        <VisitDaySection
                                            key={day.key}
                                            day={day}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                                    <Home className="size-4" aria-hidden />
                                    Aucune autre visite pour ce client.
                                </p>
                            )}
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
