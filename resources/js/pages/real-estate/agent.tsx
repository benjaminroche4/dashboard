import { AgentLeadLink } from '@/components/real-estate/agent-lead-link';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Building2, Globe, Mail, Phone } from 'lucide-react';
import { useState } from 'react';
import { AddressMapButton } from '@/components/address-map-dialog';
import { AgentDialog } from '@/components/real-estate/agent-dialog';
import { ActivityFeed } from '@/components/activity/activity-feed';
import { formatAddress } from '@/components/real-estate/columns';
import { DirectoryRelationCard } from '@/components/real-estate/directory-relation-card';
import {
    DetailHeader,
    missingValue,
} from '@/components/real-estate/detail-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    touch as agentTouch,
} from '@/routes/agents';
import type { Activity, AgencyOption, Agent, AgentAgencyCard } from '@/types';

type Props = {
    agent: Agent;
    /** Fiche de son agence, null pour un indépendant. */
    agency: AgentAgencyCard | null;
    agencies: AgencyOption[];
    /** Dix dernières actions du backoffice sur cette fiche. */
    activities?: Activity[];
};

const visitDate = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

export default function AgentShow({
    agent,
    agency,
    agencies,
    activities = [],
}: Props) {
    const [editing, setEditing] = useState(false);
    const address = formatAddress(agent);
    const agencyAddress = agency ? formatAddress(agency) : null;

    return (
        <>
            <Head title={`Agent ${agent.name}`} />
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-10">
                <DetailHeader
                    name={agent.name}
                    subtitle={
                        <>
                            {agent.position && <span>{agent.position}</span>}
                            {agent.position && agent.agency && <span>·</span>}
                            {agent.agency ? (
                                <Link
                                    href={agencyShow({
                                        agency: agent.agency.uuid,
                                    })}
                                    className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                                >
                                    <Building2
                                        className="size-3.5"
                                        aria-hidden
                                    />
                                    {agent.agency.name}
                                </Link>
                            ) : (
                                <Badge variant="secondary">Indépendant</Badge>
                            )}
                        </>
                    }
                    creator={agent.creator}
                    creatorAvatar={agent.creator_avatar}
                    createdAt={agent.created_at}
                    onEdit={() => setEditing(true)}
                    deleteUrl={agentDestroy({ agent: agent.uuid }).url}
                    deleteTitle={`Supprimer l’agent ${agent.name} ?`}
                    deleteDescription="Sa fiche sera effacée et les leads qu'il suivait n'auront plus d'agent. Cette action est irréversible."
                    favorite={{
                        active: agent.is_favorite,
                        url: agentFavorite({ agent: agent.uuid }).url,
                    }}
                >
                    <div className="grid gap-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-muted-foreground text-xs tracking-wide uppercase">
                                Coordonnées
                            </h2>
                            <AddressMapButton
                                place={{
                                    name: agent.name,
                                    address,
                                    street: agent.street,
                                    latitude: agent.latitude,
                                    longitude: agent.longitude,
                                }}
                            />
                        </div>
                        <dl className="grid gap-4 sm:grid-cols-2">
                            {[
                                {
                                    label: 'Téléphone',
                                    value: agent.phone,
                                    href: agent.phone
                                        ? `tel:${agent.phone.replace(/\s+/g, '')}`
                                        : null,
                                },
                                {
                                    label: 'E-mail',
                                    value: agent.email,
                                    href: agent.email
                                        ? `mailto:${agent.email}`
                                        : null,
                                },
                                { label: 'Adresse', value: address },
                            ].map((row) => (
                                <div
                                    key={row.label}
                                    className="grid min-w-0 gap-1"
                                >
                                    <dt className="text-muted-foreground text-sm">
                                        {row.label}
                                    </dt>
                                    <dd className="min-w-0 font-medium break-words">
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
                            <div className="grid min-w-0 gap-1">
                                <dt className="text-muted-foreground text-sm">
                                    Qualité de la relation
                                </dt>
                                <dd>
                                    {agent.relationship_quality_label ? (
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
                                    ) : (
                                        missingValue
                                    )}
                                </dd>
                            </div>
                            <div className="grid min-w-0 gap-1">
                                <dt className="text-muted-foreground text-sm">
                                    Visites avec cet agent
                                </dt>
                                <dd className="tabular-nums">
                                    {agent.visits_count > 0
                                        ? `${agent.visits_count} visite(s)${
                                              agent.last_visit_at
                                                  ? ` · dernière le ${visitDate.format(new Date(agent.last_visit_at))}`
                                                  : ''
                                          }`
                                        : missingValue}
                                </dd>
                            </div>
                        </dl>
                    </div>
                </DetailHeader>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="flex flex-col gap-4">
                        <DirectoryRelationCard
                            lastContactedAt={agent.last_contacted_at}
                            touchUrl={agentTouch({ agent: agent.uuid }).url}
                        />
                        <section
                            aria-label="Notes"
                            className="bg-sidebar grid gap-3 rounded-xl border p-4"
                        >
                            <h2 className="text-base font-medium">Notes</h2>
                            {/* Contenu sur fond blanc, comme les autres sections. */}
                            <div className="bg-background rounded-lg border p-4">
                                {agent.notes ? (
                                    <p className="text-sm/6 whitespace-pre-line">
                                        {agent.notes}
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
                        {agency && (
                            <section
                                aria-label="Agence"
                                className="bg-sidebar grid gap-3 rounded-xl border p-4"
                            >
                                <h2 className="flex items-center gap-2 text-base font-medium">
                                    <Building2 className="size-4" aria-hidden />
                                    Agence
                                </h2>
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
                                {(agency.phone ||
                                    agency.email ||
                                    agency.website) && (
                                    <div className="flex flex-wrap gap-2 border-t pt-3">
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
                                    </div>
                                )}
                                <Button variant="secondary" size="sm" asChild>
                                    <Link
                                        href={agencyShow({
                                            agency: agency.uuid,
                                        })}
                                    >
                                        Voir la fiche de l’agence
                                        <ArrowRight aria-hidden />
                                    </Link>
                                </Button>
                            </section>
                        )}
                        <section
                            aria-label="Leads et clients"
                            className="bg-sidebar grid gap-3 rounded-xl border p-4"
                        >
                            <h2 className="flex items-center gap-2 text-base font-medium">
                                Leads et clients
                                <Badge
                                    variant="secondary"
                                    className="font-medium tabular-nums"
                                >
                                    {agent.leads.length}
                                </Badge>
                            </h2>
                            {agent.leads.length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                    Aucun lead ni dossier client ne lui est
                                    rattaché. Choisissez-le dans la carte «
                                    Agent en contact » d’une fiche lead.
                                </p>
                            ) : (
                                <ul role="list" className="grid gap-1">
                                    {agent.leads.map((lead) => (
                                        <li
                                            key={lead.uuid}
                                            className="flex items-baseline justify-between gap-2 text-sm"
                                        >
                                            <AgentLeadLink lead={lead} />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                        {activities.length > 0 && (
                            <ActivityFeed
                                groups={[
                                    {
                                        label: 'Dernières actions',
                                        items: activities,
                                    },
                                ]}
                                collapseAfter={5}
                            />
                        )}
                    </aside>
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
