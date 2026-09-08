import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Building2,
    Globe,
    Mail,
    MessageCircle,
    Phone,
} from 'lucide-react';
import { useState } from 'react';
import { AgentDialog } from '@/components/real-estate/agent-dialog';
import { formatAddress } from '@/components/real-estate/columns';
import {
    DetailHeader,
    DetailRow,
    DetailSection,
    missingValue,
} from '@/components/real-estate/detail-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { show as agencyShow } from '@/routes/agencies';
import {
    destroy as agentDestroy,
    favorite as agentFavorite,
    index as agentsIndex,
} from '@/routes/agents';
import { show as leadShow } from '@/routes/leads';
import type { AgencyOption, Agent, AgentAgencyCard } from '@/types';

type Props = {
    agent: Agent;
    /** Fiche de son agence, null pour un indépendant. */
    agency: AgentAgencyCard | null;
    agencies: AgencyOption[];
};

export default function AgentShow({ agent, agency, agencies }: Props) {
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
                    backHref={agentsIndex().url}
                    backLabel="Tous les agents"
                    favorite={{
                        active: agent.is_favorite,
                        url: agentFavorite({ agent: agent.uuid }).url,
                    }}
                />

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    <div className="divide-y">
                        <DetailSection title="Contact">
                            <dl className="grid gap-3">
                                <DetailRow label="E-mail">
                                    {agent.email ? (
                                        <a
                                            href={`mailto:${agent.email}`}
                                            className="underline-offset-4 hover:underline"
                                        >
                                            {agent.email}
                                        </a>
                                    ) : (
                                        missingValue
                                    )}
                                </DetailRow>
                                <DetailRow label="Téléphone">
                                    {agent.phone ? (
                                        <a
                                            href={`tel:${agent.phone.replace(/\s+/g, '')}`}
                                            className="underline-offset-4 hover:underline"
                                        >
                                            {agent.phone}
                                        </a>
                                    ) : (
                                        missingValue
                                    )}
                                </DetailRow>
                                <DetailRow label="Adresse">
                                    {address ?? missingValue}
                                </DetailRow>
                            </dl>
                            {(agent.phone || agent.email) && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {agent.phone && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                            >
                                                <a
                                                    href={`tel:${agent.phone.replace(/\s+/g, '')}`}
                                                >
                                                    <Phone aria-hidden />
                                                    Appeler
                                                </a>
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                            >
                                                <a
                                                    href={`https://wa.me/${agent.phone.replace(/\D+/g, '')}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <MessageCircle
                                                        aria-hidden
                                                    />
                                                    WhatsApp
                                                </a>
                                            </Button>
                                        </>
                                    )}
                                    {agent.email && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                        >
                                            <a href={`mailto:${agent.email}`}>
                                                <Mail aria-hidden />
                                                Écrire
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            )}
                        </DetailSection>
                        <DetailSection title="Notes">
                            {agent.notes ? (
                                <p className="text-sm/6 whitespace-pre-line">
                                    {agent.notes}
                                </p>
                            ) : (
                                <p className="text-muted-foreground text-sm">
                                    Aucune note.
                                </p>
                            )}
                        </DetailSection>
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
                            aria-label="Leads en contact"
                            className="bg-sidebar grid gap-3 rounded-xl border p-4"
                        >
                            <h2 className="flex items-center gap-2 text-base font-medium">
                                Leads en contact
                                <Badge
                                    variant="secondary"
                                    className="font-medium tabular-nums"
                                >
                                    {agent.leads.length}
                                </Badge>
                            </h2>
                            {agent.leads.length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                    Aucun lead ne lui est rattaché.
                                    Choisissez-le dans la carte « Agent en
                                    contact » d’une fiche lead.
                                </p>
                            ) : (
                                <ul role="list" className="grid gap-1">
                                    {agent.leads.map((lead) => (
                                        <li
                                            key={lead.uuid}
                                            className="flex items-baseline justify-between gap-2 text-sm"
                                        >
                                            <Link
                                                href={leadShow({
                                                    lead: lead.uuid,
                                                })}
                                                className="truncate font-medium underline-offset-4 hover:underline"
                                            >
                                                {lead.name}
                                            </Link>
                                            <span className="text-muted-foreground shrink-0 text-xs">
                                                {lead.status_label}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
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
