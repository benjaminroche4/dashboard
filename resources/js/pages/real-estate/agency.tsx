import { Head, Link } from '@inertiajs/react';
import { Globe, Plus } from 'lucide-react';
import { useState } from 'react';
import { AgencyDialog } from '@/components/real-estate/agency-dialog';
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
import {
    destroy as agencyDestroy,
    index as agenciesIndex,
} from '@/routes/agencies';
import { index as agentsIndex, show as agentShow } from '@/routes/agents';
import { show as leadShow } from '@/routes/leads';
import type { AgencyDetail } from '@/types';

type Props = {
    agency: AgencyDetail;
};

export default function AgencyShow({ agency }: Props) {
    const [editing, setEditing] = useState(false);
    const [addingAgent, setAddingAgent] = useState(false);
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
                    backHref={agenciesIndex().url}
                    backLabel="Toutes les agences"
                />

                <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    <div className="divide-y">
                        <DetailSection title="Coordonnées">
                            <dl className="grid gap-3">
                                <DetailRow label="Adresse">
                                    {address ?? missingValue}
                                </DetailRow>
                                <DetailRow label="Téléphone">
                                    {agency.phone ? (
                                        <a
                                            href={`tel:${agency.phone.replace(/\s+/g, '')}`}
                                            className="underline-offset-4 hover:underline"
                                        >
                                            {agency.phone}
                                        </a>
                                    ) : (
                                        missingValue
                                    )}
                                </DetailRow>
                                <DetailRow label="E-mail">
                                    {agency.email ? (
                                        <a
                                            href={`mailto:${agency.email}`}
                                            className="underline-offset-4 hover:underline"
                                        >
                                            {agency.email}
                                        </a>
                                    ) : (
                                        missingValue
                                    )}
                                </DetailRow>
                                <DetailRow label="Site web">
                                    {agency.website ? (
                                        <a
                                            href={agency.website}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="underline-offset-4 hover:underline"
                                        >
                                            {agency.website}
                                        </a>
                                    ) : (
                                        missingValue
                                    )}
                                </DetailRow>
                            </dl>
                        </DetailSection>
                        <DetailSection
                            title="Agents"
                            action={
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAddingAgent(true)}
                                >
                                    <Plus aria-hidden />
                                    Ajouter un agent
                                </Button>
                            }
                        >
                            {agency.agents.length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                    Aucun agent rattaché pour le moment.
                                </p>
                            ) : (
                                <ul
                                    role="list"
                                    className="divide-y rounded-xl border"
                                >
                                    {agency.agents.map((agent) => (
                                        <li
                                            key={agent.id}
                                            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                                        >
                                            <div className="grid min-w-0">
                                                <Link
                                                    href={agentShow({
                                                        agent: agent.uuid,
                                                    })}
                                                    className="truncate font-medium underline-offset-4 hover:underline"
                                                >
                                                    {agent.name}
                                                </Link>
                                                <span className="text-muted-foreground truncate text-xs">
                                                    {[
                                                        agent.position,
                                                        agent.email,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' · ') ||
                                                        'Fonction non renseignée'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {agent.phone && (
                                                    <a
                                                        href={`tel:${agent.phone.replace(/\s+/g, '')}`}
                                                        className="text-muted-foreground text-xs tabular-nums underline-offset-4 hover:underline"
                                                    >
                                                        {agent.phone}
                                                    </a>
                                                )}
                                                <Badge
                                                    variant="secondary"
                                                    className="tabular-nums"
                                                    aria-label={`${agent.leads_count} lead(s)`}
                                                >
                                                    {agent.leads_count} lead(s)
                                                </Badge>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </DetailSection>
                        <DetailSection title="Notes">
                            {agency.notes ? (
                                <p className="text-sm/6 whitespace-pre-line">
                                    {agency.notes}
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
                            aria-label="Leads en contact"
                            className="bg-sidebar grid gap-3 rounded-xl border p-4"
                        >
                            <h2 className="flex items-center gap-2 text-base font-medium">
                                Leads en contact
                                <Badge
                                    variant="secondary"
                                    className="font-medium tabular-nums"
                                >
                                    {agency.leads.length}
                                </Badge>
                            </h2>
                            {agency.leads.length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                    Aucun lead n’est suivi par un agent de cette
                                    agence.
                                </p>
                            ) : (
                                <ul role="list" className="grid gap-1">
                                    {agency.leads.map((lead) => (
                                        <li
                                            key={lead.uuid}
                                            className="flex items-baseline justify-between gap-2 text-sm"
                                        >
                                            <span className="grid min-w-0">
                                                <Link
                                                    href={leadShow({
                                                        lead: lead.uuid,
                                                    })}
                                                    className="truncate font-medium underline-offset-4 hover:underline"
                                                >
                                                    {lead.name}
                                                </Link>
                                                {lead.agent && (
                                                    <span className="text-muted-foreground truncate text-xs">
                                                        via {lead.agent}
                                                    </span>
                                                )}
                                            </span>
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
