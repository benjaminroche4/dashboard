import { Link } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { show as agentShow } from '@/routes/agents';
import type { Agency } from '@/types';

/**
 * Compteur d'agents d'une agence : au clic, la liste des agents avec leur
 * téléphone et un bouton pour en ajouter un, déjà rattaché à cette agence.
 */
export function AgencyAgentsPopover({
    agency,
    onAddAgent,
}: {
    agency: Agency;
    onAddAgent: (agency: Agency) => void;
}) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="tabular-nums"
                    aria-label={`${agency.agents.length} agent(s) de ${agency.name}`}
                >
                    {agency.agents.length}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-0">
                <div className="border-b px-3 py-2 text-sm font-medium">
                    Agents de {agency.name}
                </div>
                {agency.agents.length === 0 ? (
                    <p className="text-muted-foreground px-3 py-2 text-sm">
                        Aucun agent pour le moment.
                    </p>
                ) : (
                    <ul role="list" className="max-h-64 overflow-y-auto py-1">
                        {agency.agents.map((agent) => (
                            <li
                                key={agent.id}
                                className="flex items-baseline justify-between gap-2 px-3 py-1.5 text-sm"
                            >
                                <span className="grid min-w-0">
                                    <Link
                                        href={agentShow({ agent: agent.uuid })}
                                        className="truncate font-medium underline-offset-4 hover:underline"
                                    >
                                        {agent.name}
                                    </Link>
                                    {agent.position && (
                                        <span className="text-muted-foreground truncate text-xs">
                                            {agent.position}
                                        </span>
                                    )}
                                </span>
                                {agent.phone && (
                                    <a
                                        href={`tel:${agent.phone.replace(/\s+/g, '')}`}
                                        className="text-muted-foreground shrink-0 text-xs tabular-nums underline-offset-4 hover:underline"
                                    >
                                        {agent.phone}
                                    </a>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
                <div className="border-t p-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => onAddAgent(agency)}
                    >
                        <Plus aria-hidden />
                        Ajouter un agent
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
