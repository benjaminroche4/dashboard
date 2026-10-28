import { AgentLeadLink } from '@/components/real-estate/agent-lead-link';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    Building2,
    CalendarCheck,
    Clock,
    Contact,
    Globe,
    History,
    Mail,
    NotebookPen,
    Phone,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { AddressMapButton } from '@/components/address-map-dialog';
import { ActivityFeed } from '@/components/activity/activity-feed';
import { ClampedText } from '@/components/clamped-text';
import { CreatedBy } from '@/components/created-by';
import { FavoriteStar } from '@/components/favorite-star';
import {
    Rows,
    Section,
    TimelineDot,
    type Fact,
} from '@/components/leads/lead-show-body';
import { AgentDialog } from '@/components/real-estate/agent-dialog';
import { AgencyProfileCard } from '@/components/real-estate/agency-profile-card';
import { formatAddress } from '@/components/real-estate/columns';
import { missingValue } from '@/components/real-estate/detail-header';
import { RealEstateRowActions } from '@/components/real-estate/real-estate-row-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { parisFormat } from '@/lib/datetime';
import {
    relationshipQualityTones,
    type RelationshipQualityValue,
} from '@/lib/relationship-quality';
import { cn } from '@/lib/utils';
import { show as agencyShow } from '@/routes/agencies';
import {
    destroy as agentDestroy,
    favorite as agentFavorite,
    index as agentsIndex,
    profile as agentProfile,
    touch as agentTouch,
} from '@/routes/agents';
import type {
    Activity,
    AgencyOption,
    Agent,
    AgentAgencyCard,
    ProfileOptions,
} from '@/types';

type Props = {
    agent: Agent;
    /** Fiche de son agence, null pour un indépendant. */
    agency: AgentAgencyCard | null;
    agencies: AgencyOption[];
    /** Dix dernières actions du backoffice sur cette fiche. */
    activities?: Activity[];
    profileOptions?: ProfileOptions;
};

const emptyOptions: ProfileOptions = {
    specialties: [],
    languages: [],
    mandateTypes: [],
};

const visitDate = parisFormat({
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

const contactDate = parisFormat({
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

/** Initiales d'un nom (deux lettres au plus). */
function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() ?? '')
        .join('');
}

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
 * Fiche d'un agent immobilier, **sur le moule de la fiche lead** (demandé le
 * 28 octobre 2026 : les cartes grises en deux colonnes inégales se lisaient
 * mal) : deux moitiés égales séparées d'un filet. À gauche, la personne et
 * son suivi — l'en-tête sur fond gris (pastille, nom, favori, fonction,
 * agence, qualité de la relation, menu « ⋯ » qui porte Modifier), le contact
 * en lignes deux par deux, puis la frise « Suivi et notes » (dernier
 * échange, « Échange noté », notes repliables). À droite, son agence, son
 * profil de matching, ses leads et clients, puis les dernières actions.
 */
export default function AgentShow({
    agent,
    agency,
    agencies,
    activities = [],
    profileOptions = emptyOptions,
}: Props) {
    const [editing, setEditing] = useState(false);
    const [touching, setTouching] = useState(false);
    const agencyAddress = agency ? formatAddress(agency) : null;
    // Un agent rattaché travaille à l'adresse de son agence : c'est celle-là
    // qu'on montre, la sienne n'étant renseignée que pour un indépendant.
    const address = agency ? agencyAddress : formatAddress(agent);
    const place = agency ?? agent;
    const touch = () => {
        setTouching(true);
        router.post(
            agentTouch({ agent: agent.uuid }).url,
            {},
            { preserveScroll: true, onFinish: () => setTouching(false) },
        );
    };

    const contact: Fact[] = [
        {
            label: 'Téléphone',
            icon: <Phone className="size-3.5" aria-hidden />,
            value: contactValue(
                agent.phone,
                agent.phone ? `tel:${agent.phone.replace(/\s+/g, '')}` : null,
            ),
        },
        {
            label: 'E-mail',
            icon: <Mail className="size-3.5" aria-hidden />,
            value: contactValue(
                agent.email,
                agent.email ? `mailto:${agent.email}` : null,
            ),
        },
        {
            label: agency ? 'Adresse de l’agence' : 'Adresse',
            icon: <Building2 className="size-3.5" aria-hidden />,
            value: address ?? missingValue,
        },
        {
            label: 'Visites avec cet agent',
            icon: <CalendarCheck className="size-3.5" aria-hidden />,
            value:
                agent.visits_count > 0
                    ? `${agent.visits_count} visite(s)${
                          agent.last_visit_at
                              ? ` · dernière le ${visitDate.format(new Date(agent.last_visit_at))}`
                              : ''
                      }`
                    : missingValue,
        },
    ];

    const header = (
        <div
            className="bg-sidebar flex items-start justify-between gap-4 rounded-xl border p-4"
            data-testid="agent-header"
        >
            <div className="flex min-w-0 items-center gap-4">
                <span
                    aria-hidden
                    className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-lg text-sm font-semibold"
                >
                    {initials(agent.name)}
                </span>
                <div className="min-w-0">
                    {/* L'étoile reste hors du titre : le nom accessible du <h1>
                        ne doit pas se terminer par « Favori ». */}
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="truncate text-lg font-medium">
                            {agent.name}
                        </h1>
                        <FavoriteStar favorite={agent.is_favorite} />
                        {agent.relationship_quality_label && (
                            <Badge
                                variant="secondary"
                                className={cn(
                                    'font-medium',
                                    relationshipQualityTones[
                                        agent.relationship_quality as RelationshipQualityValue
                                    ],
                                )}
                            >
                                {agent.relationship_quality_label}
                            </Badge>
                        )}
                    </div>
                    <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm">
                        {agent.position && <span>{agent.position}</span>}
                        {agent.position && <span>·</span>}
                        {agent.agency ? (
                            <Link
                                href={agencyShow({
                                    agency: agent.agency.uuid,
                                })}
                                className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                            >
                                <Building2 className="size-3.5" aria-hidden />
                                {agent.agency.name}
                            </Link>
                        ) : (
                            <Badge variant="secondary">Indépendant</Badge>
                        )}
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                        <CreatedBy
                            name={agent.creator}
                            avatar={agent.creator_avatar}
                            date={agent.created_at}
                            verb="Ajouté(e) par"
                        />
                    </p>
                </div>
            </div>
            {/* Toutes les actions dans le menu « ⋯ », comme sur la fiche lead. */}
            <RealEstateRowActions
                favorite={{
                    active: agent.is_favorite,
                    url: agentFavorite({ agent: agent.uuid }).url,
                }}
                name={agent.name}
                deleteUrl={agentDestroy({ agent: agent.uuid }).url}
                deleteTitle={`Supprimer l’agent ${agent.name} ?`}
                deleteDescription="Sa fiche sera effacée et les leads qu'il suivait n'auront plus d'agent. Cette action est irréversible."
                onEdit={() => setEditing(true)}
            />
        </div>
    );

    return (
        <>
            <Head title={`Agent ${agent.name}`} />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pt-8">
                <div
                    className="grid gap-8 lg:flex-1 lg:grid-cols-2 lg:gap-0 lg:divide-x"
                    data-testid="agent-columns"
                >
                    {/* Qui il est et le suivi de la relation. */}
                    <div className="grid content-start gap-6 lg:sticky lg:top-20 lg:-ml-3 lg:max-h-[calc(100dvh-5rem)] lg:self-start lg:overflow-y-auto lg:pr-8 lg:pb-8 lg:pl-3">
                        {header}
                        <div className="divide-y">
                        <Section
                            title="Contact"
                            icon={Contact}
                            action={
                                <AddressMapButton
                                    place={{
                                        name: agent.name,
                                        address,
                                        street: place.street,
                                        latitude: place.latitude,
                                        longitude: place.longitude,
                                    }}
                                />
                            }
                        >
                            <Rows facts={contact} columns={2} />
                        </Section>
                        {/* Le suivi en frise, comme « Suivi par » d'un lead :
                            le dernier échange sur le rail, le bouton qui note
                            celui du jour, et les notes libres dessous. */}
                        <Section
                            title="Suivi et notes"
                            icon={NotebookPen}
                            action={
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={touching}
                                    onClick={touch}
                                >
                                    <CalendarCheck aria-hidden />
                                    Échange noté
                                </Button>
                            }
                        >
                            <ol className="relative grid gap-4 border-l pl-5 text-sm">
                                <li className="relative">
                                    <TimelineDot
                                        tone="past"
                                        step={0}
                                        replayKey={
                                            agent.last_contacted_at ?? ''
                                        }
                                    />
                                    <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                                        <Clock
                                            className="size-3.5"
                                            aria-hidden
                                        />
                                        Dernier échange
                                    </div>
                                    <div className="font-medium">
                                        {agent.last_contacted_at
                                            ? contactDate.format(
                                                  new Date(
                                                      agent.last_contacted_at,
                                                  ),
                                              )
                                            : 'Aucun échange noté pour le moment.'}
                                    </div>
                                </li>
                                <li className="relative">
                                    <TimelineDot tone="next" step={1} />
                                    <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                                        <NotebookPen
                                            className="size-3.5"
                                            aria-hidden
                                        />
                                        Notes
                                    </div>
                                    {agent.notes ? (
                                        <ClampedText
                                            text={agent.notes}
                                            className="text-sm/6"
                                        />
                                    ) : (
                                        <p className="text-muted-foreground">
                                            Aucune note.
                                        </p>
                                    )}
                                </li>
                            </ol>
                        </Section>
                        </div>
                    </div>
                    {/* Son agence, son profil, ses leads, ce qui s'est passé. */}
                    <div className="grid content-start lg:pb-10 lg:pl-8">
                        <div className="divide-y">
                            {agency && (
                                <Section title="Agence" icon={Building2}>
                                    <div className="grid gap-1 text-sm">
                                        <Link
                                            href={agencyShow({
                                                agency: agency.uuid,
                                            })}
                                            className="font-medium underline-offset-4 hover:underline"
                                        >
                                            {agency.name}
                                        </Link>
                                        {agencyAddress && (
                                            <span className="text-muted-foreground">
                                                {agencyAddress}
                                            </span>
                                        )}
                                        <span className="text-muted-foreground text-xs">
                                            {agency.agents_count} agent(s)
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {agency.phone && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                            >
                                                <a
                                                    href={`tel:${agency.phone.replace(/\s+/g, '')}`}
                                                >
                                                    <Phone aria-hidden />
                                                    {agency.phone}
                                                </a>
                                            </Button>
                                        )}
                                        {agency.email && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                            >
                                                <a
                                                    href={`mailto:${agency.email}`}
                                                >
                                                    <Mail aria-hidden />
                                                    {agency.email}
                                                </a>
                                            </Button>
                                        )}
                                        {agency.website && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                            >
                                                <a
                                                    href={agency.website}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <Globe aria-hidden />
                                                    Site web
                                                </a>
                                            </Button>
                                        )}
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            asChild
                                        >
                                            <Link
                                                href={agencyShow({
                                                    agency: agency.uuid,
                                                })}
                                            >
                                                Voir la fiche de l’agence
                                                <ArrowRight aria-hidden />
                                            </Link>
                                        </Button>
                                    </div>
                                </Section>
                            )}
                            <AgencyProfileCard
                                scope="agent"
                                variant="plain"
                                agent={agent}
                                options={profileOptions}
                                urls={{
                                    profile: agentProfile({
                                        agent: agent.uuid,
                                    }).url,
                                }}
                            />
                            <Section
                                title="Leads et clients"
                                icon={Users}
                                action={
                                    agent.leads.length > 0 ? (
                                        <Badge
                                            variant="secondary"
                                            className="tabular-nums"
                                        >
                                            {agent.leads.length}
                                        </Badge>
                                    ) : undefined
                                }
                            >
                                {agent.leads.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">
                                        Aucun lead ni dossier client ne lui est
                                        rattaché. Choisissez-le dans la carte «
                                        Agent en contact » d’une fiche lead.
                                    </p>
                                ) : (
                                    <ul role="list" className="grid divide-y">
                                        {agent.leads.map((lead) => (
                                            <li
                                                key={lead.uuid}
                                                className="flex items-baseline justify-between gap-2 py-2 text-sm first:pt-0 last:pb-0"
                                            >
                                                <AgentLeadLink lead={lead} />
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Section>
                            {activities.length > 0 && (
                                <Section
                                    title="Dernières actions"
                                    icon={History}
                                >
                                    <ActivityFeed
                                        // La section titre déjà : le fil ne répète pas l'intitulé.
                                        groups={[{ label: '', items: activities }]}
                                        collapseAfter={5}
                                    />
                                </Section>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <AgentDialog
                open={editing}
                onOpenChange={setEditing}
                agencies={agencies}
                agent={agent}
            />
        </>
    );
}

AgentShow.layout = {
    breadcrumbs: [
        { title: 'Agents immobiliers', href: agentsIndex() },
        { title: 'Agents', href: agentsIndex() },
        { title: 'Détail', href: '#' },
    ],
};
