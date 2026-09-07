import { Link, router } from '@inertiajs/react';
import { Building2, Mail, MessageCircle, Phone, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { show as agentShow } from '@/routes/agents';
import { agent as leadAgentRoute } from '@/routes/leads';
import type { AgentOption, LeadDetail } from '@/types';

/** Lien WhatsApp vers un numéro saisi librement (indicatif compris). */
function whatsAppUrl(phone: string): string {
    return `https://wa.me/${phone.replace(/\D+/g, '')}`;
}

/** Agents groupés par agence, les indépendants en dernier. */
export function groupAgents(
    agents: AgentOption[],
): { label: string; agents: AgentOption[] }[] {
    const groups = new Map<string, AgentOption[]>();

    for (const agent of agents) {
        const key = agent.agency ?? '';
        groups.set(key, [...(groups.get(key) ?? []), agent]);
    }

    return [...groups.entries()]
        .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)))
        .map(([label, members]) => ({
            label: label === '' ? 'Indépendants' : label,
            agents: members,
        }));
}

/**
 * Carte « Agent en contact » de la fiche lead : l'agent immobilier choisi
 * dans l'annuaire, ses coordonnées cliquables, et le sélecteur pour le changer.
 */
export function LeadAgentCard({
    lead,
    agents,
}: {
    lead: LeadDetail;
    agents: AgentOption[];
}) {
    const [saving, setSaving] = useState(false);
    const current = lead.agent;

    const set = (agentId: number | null) => {
        setSaving(true);
        router.patch(
            leadAgentRoute({ lead: lead.uuid }).url,
            { agent_id: agentId },
            { preserveScroll: true, onFinish: () => setSaving(false) },
        );
    };

    return (
        <section
            aria-label="Agent en contact"
            className="bg-sidebar grid gap-3 rounded-xl border p-4"
        >
            <header className="flex items-center justify-between gap-2">
                <h2 className="text-base font-medium">Agent en contact</h2>
                {saving && <Spinner />}
            </header>
            {current ? (
                <div className="grid gap-1 text-sm">
                    <Link
                        href={agentShow({ agent: current.uuid })}
                        className="font-medium underline-offset-4 hover:underline"
                    >
                        {current.name}
                    </Link>
                    {(current.agency || current.position) && (
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                            <Building2 className="size-3.5" aria-hidden />
                            {[current.agency, current.position]
                                .filter(Boolean)
                                .join(' · ')}
                        </span>
                    )}
                    <div className="flex flex-wrap items-center gap-1 pt-1">
                        {current.phone && (
                            <>
                                <Button variant="outline" size="sm" asChild>
                                    <a
                                        href={`tel:${current.phone.replace(/\s+/g, '')}`}
                                    >
                                        <Phone aria-hidden />
                                        Appeler
                                    </a>
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                    <a
                                        href={whatsAppUrl(current.phone)}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <MessageCircle aria-hidden />
                                        WhatsApp
                                    </a>
                                </Button>
                            </>
                        )}
                        {current.email && (
                            <Button variant="outline" size="sm" asChild>
                                <a href={`mailto:${current.email}`}>
                                    <Mail aria-hidden />
                                    E-mail
                                </a>
                            </Button>
                        )}
                    </div>
                </div>
            ) : (
                <p className="text-muted-foreground text-sm">
                    Aucun agent immobilier sur ce dossier.
                </p>
            )}
            <div className="flex items-center gap-2 border-t pt-3">
                <Select
                    value={current ? String(current.id) : ''}
                    onValueChange={(value) => set(Number(value))}
                    disabled={saving || agents.length === 0}
                >
                    <SelectTrigger
                        aria-label="Choisir un agent"
                        className="w-full"
                    >
                        <SelectValue
                            placeholder={
                                agents.length === 0
                                    ? 'Aucun agent dans l’annuaire'
                                    : current
                                      ? 'Changer d’agent'
                                      : 'Choisir un agent'
                            }
                        />
                    </SelectTrigger>
                    <SelectContent>
                        {groupAgents(agents).map((group) => (
                            <SelectGroup key={group.label}>
                                <SelectLabel>{group.label}</SelectLabel>
                                {group.agents.map((agent) => (
                                    <SelectItem
                                        key={agent.id}
                                        value={String(agent.id)}
                                    >
                                        {agent.name}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        ))}
                    </SelectContent>
                </Select>
                {current && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Retirer l’agent"
                        disabled={saving}
                        onClick={() => set(null)}
                    >
                        <X aria-hidden />
                    </Button>
                )}
            </div>
        </section>
    );
}
