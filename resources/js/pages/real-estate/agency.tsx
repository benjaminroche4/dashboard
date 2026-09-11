import { Head, Link } from '@inertiajs/react';
import { Globe, House, Mail, Phone, Plus } from 'lucide-react';
import { useState } from 'react';
import { AddressMapButton } from '@/components/address-map-dialog';
import { AgencyDialog } from '@/components/real-estate/agency-dialog';
import { AgentDialog } from '@/components/real-estate/agent-dialog';
import { ActivityFeed } from '@/components/activity/activity-feed';
import { formatAddress } from '@/components/real-estate/columns';
import { DirectoryRelationCard } from '@/components/real-estate/directory-relation-card';
import {
    DetailHeader,
    missingValue,
} from '@/components/real-estate/detail-header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useInitials } from '@/hooks/use-initials';
import {
    destroy as agencyDestroy,
    favorite as agencyFavorite,
    index as agenciesIndex,
    touch as agencyTouch,
} from '@/routes/agencies';
import { index as agentsIndex, show as agentShow } from '@/routes/agents';
import { show as propertyShow } from '@/routes/properties';
import type { Activity, AgencyDetail } from '@/types';

type Props = {
    agency: AgencyDetail;
    /** Carte statique de l'adresse, null sans clé Maps Static dédiée. */
    mapUrl?: string | null;
    /** Dix dernières actions du backoffice sur cette fiche. */
    activities?: Activity[];
};

const visitDate = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

export default function AgencyShow({
    agency,
    mapUrl = null,
    activities = [],
}: Props) {
    const [editing, setEditing] = useState(false);
    const [addingAgent, setAddingAgent] = useState(false);
    const initials = useInitials();
    const address = formatAddress(agency);

    return (
        <>
            <Head title={`Agence ${agency.name}`} />
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-10">
                <DetailHeader
                    name={agency.name}
                    subtitle={
                        agency.website ? (
                            <a
                                href={agency.website}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                            >
                                <Globe className="size-3.5" aria-hidden />
                                {agency.website.replace(/^https?:\/\//, '')}
                            </a>
                        ) : undefined
                    }
                    creator={agency.creator}
                    creatorAvatar={agency.creator_avatar}
                    createdAt={agency.created_at}
                    onEdit={() => setEditing(true)}
                    deleteUrl={agencyDestroy({ agency: agency.uuid }).url}
                    deleteTitle={`Supprimer l’agence ${agency.name} ?`}
                    deleteDescription="Ses agents sont conservés, sans agence. Cette action est irréversible."
                    tone="bg-muted text-muted-foreground"
                    favorite={{
                        active: agency.is_favorite,
                        url: agencyFavorite({ agency: agency.uuid }).url,
                    }}
                />

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="flex flex-col gap-6">
                        <section
                            aria-label="Coordonnées"
                            className="bg-sidebar grid gap-3 rounded-xl border p-4"
                        >
                            {/* Titre et action sur le fond gris, contenu en blanc :
                                même découpe que les autres sections de la fiche. */}
                            <header className="flex flex-wrap items-center justify-between gap-2">
                                <h2 className="text-base font-medium">
                                    Coordonnées
                                </h2>
                                <AddressMapButton
                                    place={{
                                        name: agency.name,
                                        address,
                                        street: agency.street,
                                        latitude: agency.latitude,
                                        longitude: agency.longitude,
                                    }}
                                />
                            </header>
                            <div className="bg-background grid gap-4 rounded-lg border p-4">
                                {mapUrl && (
                                    <img
                                        src={mapUrl}
                                        alt={`Carte de ${address ?? agency.name}`}
                                        loading="lazy"
                                        className="h-40 w-full rounded-lg border object-cover"
                                    />
                                )}
                                <dl className="divide-border grid divide-y text-sm">
                                    {[
                                        {
                                            label: 'Téléphone',
                                            value: agency.phone,
                                            href: agency.phone
                                                ? `tel:${agency.phone.replace(/\s+/g, '')}`
                                                : null,
                                        },
                                        {
                                            label: 'E-mail',
                                            value: agency.email,
                                            href: agency.email
                                                ? `mailto:${agency.email}`
                                                : null,
                                        },
                                        {
                                            label: 'Site web',
                                            value: agency.website?.replace(
                                                /^https?:\/\//,
                                                '',
                                            ),
                                            href: agency.website,
                                            external: true,
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
                                                            {...(row.external
                                                                ? {
                                                                      target: '_blank',
                                                                      rel: 'noreferrer',
                                                                  }
                                                                : {})}
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
                        </section>
                        {/* Même carte que « Interlocuteurs » sur la fiche partenaire. */}
                        <section
                            aria-label="Agents"
                            className="bg-sidebar grid gap-3 rounded-xl border p-4"
                        >
                            <header className="flex flex-wrap items-center justify-between gap-2">
                                <h2 className="flex items-center gap-2 text-base font-medium">
                                    Agents
                                    <Badge
                                        variant="secondary"
                                        className="font-medium tabular-nums"
                                    >
                                        {agency.agents.length}
                                    </Badge>
                                </h2>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAddingAgent(true)}
                                >
                                    <Plus aria-hidden />
                                    Ajouter un agent
                                </Button>
                            </header>
                            {agency.agents.length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                    Aucun agent rattaché pour le moment.
                                </p>
                            ) : (
                                <ul role="list" className="grid gap-2">
                                    {agency.agents.map((agent) => (
                                        <li
                                            key={agent.id}
                                            className="bg-background grid gap-2 rounded-lg border p-3 text-sm"
                                        >
                                            {/* Identité d'abord, moyens de contact ensuite : la
                                                colonne est étroite, rien ne se dispute la ligne. */}
                                            <div className="flex items-start gap-3">
                                                <Avatar className="size-8 shrink-0">
                                                    <AvatarFallback className="text-xs">
                                                        {initials(agent.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="grid min-w-0 flex-1 gap-0.5">
                                                    <span className="flex min-w-0 items-center gap-2">
                                                        <Link
                                                            href={agentShow({
                                                                agent: agent.uuid,
                                                            })}
                                                            className="truncate font-medium underline-offset-4 hover:underline"
                                                        >
                                                            {agent.name}
                                                        </Link>
                                                        {/* L'agent principal, celui qu'on appelle en premier. */}
                                                        {agent.is_primary && (
                                                            <Badge
                                                                variant="outline"
                                                                className="shrink-0 border-emerald-200 bg-emerald-50 font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                                                            >
                                                                Principal
                                                            </Badge>
                                                        )}
                                                    </span>
                                                    {agent.position && (
                                                        <span className="text-muted-foreground truncate text-xs">
                                                            {agent.position}
                                                        </span>
                                                    )}
                                                </div>
                                                <Badge
                                                    variant="secondary"
                                                    className="shrink-0 font-medium tabular-nums"
                                                    aria-label={`${agent.leads_count} lead(s)`}
                                                >
                                                    {agent.leads_count} lead(s)
                                                </Badge>
                                            </div>
                                            {(agent.phone || agent.email) && (
                                                <div className="grid gap-1.5 border-t pt-2 sm:grid-cols-2">
                                                    {agent.phone && (
                                                        <a
                                                            href={`tel:${agent.phone.replace(/\s+/g, '')}`}
                                                            className="text-muted-foreground hover:text-foreground hover:bg-accent flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-xs transition-colors"
                                                        >
                                                            <Phone
                                                                className="size-3.5 shrink-0"
                                                                aria-hidden
                                                            />
                                                            <span className="truncate tabular-nums">
                                                                {agent.phone}
                                                            </span>
                                                        </a>
                                                    )}
                                                    {agent.email && (
                                                        <a
                                                            href={`mailto:${agent.email}`}
                                                            className="text-muted-foreground hover:text-foreground hover:bg-accent flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-xs transition-colors"
                                                        >
                                                            <Mail
                                                                className="size-3.5 shrink-0"
                                                                aria-hidden
                                                            />
                                                            <span className="truncate">
                                                                {agent.email}
                                                            </span>
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                        <DirectoryRelationCard
                            lastContactedAt={agency.last_contacted_at}
                            touchUrl={agencyTouch({ agency: agency.uuid }).url}
                        />
                        <section
                            aria-label="Notes"
                            className="bg-sidebar grid gap-3 rounded-xl border p-4"
                        >
                            <h2 className="text-base font-medium">Notes</h2>
                            {/* Contenu sur fond blanc, comme les coordonnées. */}
                            <div className="bg-background rounded-lg border p-4">
                                {agency.notes ? (
                                    <p className="text-sm/6 whitespace-pre-line">
                                        {agency.notes}
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
                            aria-label="Biens visités"
                            className="bg-sidebar grid gap-3 rounded-xl border p-4"
                        >
                            <h2 className="flex items-center gap-2 text-base font-medium">
                                <House className="size-4" aria-hidden />
                                Biens visités
                                <Badge
                                    variant="secondary"
                                    className="font-medium tabular-nums"
                                >
                                    {agency.properties.length}
                                </Badge>
                            </h2>
                            {agency.properties.length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                    Aucun bien n’a encore été visité avec cette
                                    agence.
                                </p>
                            ) : (
                                <ul role="list" className="grid gap-2">
                                    {agency.properties.map((property) => (
                                        <li
                                            key={property.uuid}
                                            className="bg-background grid gap-1 rounded-lg border px-3 py-2 text-sm"
                                        >
                                            <span className="flex items-baseline justify-between gap-2">
                                                <Link
                                                    href={propertyShow({
                                                        property: property.uuid,
                                                    })}
                                                    className="truncate font-medium underline-offset-4 hover:underline"
                                                >
                                                    {property.label}
                                                </Link>
                                                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                                                    {property.visits_count}{' '}
                                                    visite
                                                    {property.visits_count > 1
                                                        ? 's'
                                                        : ''}
                                                </span>
                                            </span>
                                            <span className="text-muted-foreground truncate text-xs">
                                                Dernière :{' '}
                                                {visitDate.format(
                                                    new Date(
                                                        property.last_visit_at,
                                                    ),
                                                )}{' '}
                                                · {property.last_visit_status}
                                                {property.agent &&
                                                    ` · ${property.agent}`}
                                            </span>
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
            <AgencyDialog
                open={editing}
                onOpenChange={setEditing}
                agency={agency}
            />
            <AgentDialog
                open={addingAgent}
                onOpenChange={setAddingAgent}
                agencies={[
                    { id: agency.id, uuid: agency.uuid, name: agency.name },
                ]}
                defaultAgencyId={agency.id}
            />
        </>
    );
}

AgencyShow.layout = {
    breadcrumbs: [
        { title: 'Agents immobiliers', href: agentsIndex() },
        { title: 'Agences', href: agenciesIndex() },
        { title: 'Détail', href: '#' },
    ],
};
