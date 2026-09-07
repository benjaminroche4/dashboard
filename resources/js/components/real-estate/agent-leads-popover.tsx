import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { show as leadShow } from '@/routes/leads';
import type { Agent } from '@/types';

/** Nombre de leads suivis par un agent ; au clic, la liste avec lien vers chaque fiche. */
export function AgentLeadsPopover({ agent }: { agent: Agent }) {
    if (agent.leads.length === 0) {
        return <span className="text-muted-foreground tabular-nums">0</span>;
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="tabular-nums"
                    aria-label={`${agent.leads.length} lead(s) suivi(s) par ${agent.name}`}
                >
                    {agent.leads.length}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-0">
                <div className="border-b px-3 py-2 text-sm font-medium">
                    Leads en contact avec {agent.name}
                </div>
                <ul role="list" className="max-h-64 overflow-y-auto py-1">
                    {agent.leads.map((lead) => (
                        <li
                            key={lead.uuid}
                            className="flex items-baseline justify-between gap-2 px-3 py-1.5 text-sm"
                        >
                            <Link
                                href={leadShow({ lead: lead.uuid })}
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
            </PopoverContent>
        </Popover>
    );
}
