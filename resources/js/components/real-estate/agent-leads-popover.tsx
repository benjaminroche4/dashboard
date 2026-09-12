import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { AgentLeadLink } from '@/components/real-estate/agent-lead-link';
import type { Agent } from '@/types';

/** Nombre de leads et de dossiers clients suivis par un agent ; au clic, la liste. */
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
                    aria-label={`${agent.leads.length} lead(s) ou client(s) suivi(s) par ${agent.name}`}
                >
                    {agent.leads.length}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-0">
                <div className="border-b px-3 py-2 text-sm font-medium">
                    Leads et clients de {agent.name}
                </div>
                <ul role="list" className="max-h-64 overflow-y-auto py-1">
                    {agent.leads.map((lead) => (
                        <li
                            key={lead.uuid}
                            className="flex items-baseline justify-between gap-2 px-3 py-1.5 text-sm"
                        >
                            <AgentLeadLink lead={lead} />
                        </li>
                    ))}
                </ul>
            </PopoverContent>
        </Popover>
    );
}
