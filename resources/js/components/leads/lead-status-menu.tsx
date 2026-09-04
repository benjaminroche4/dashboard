import { router } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { status as leadStatusRoute } from '@/routes/leads';
import type { Lead, LeadStatus, LeadStatusOption } from '@/types';

// Couleurs personnalisées (pattern « Custom Colors » de shadcn Badge).
export const leadStatusClasses: Record<LeadStatus, string> = {
    new: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
    contacted: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    in_discussion:
        'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    converted:
        'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
    lost: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400',
};

/**
 * Badge de statut cliquable : choisir un autre statut le met à jour en place.
 */
export function LeadStatusMenu({
    lead,
    statuses,
}: {
    lead: Lead;
    statuses: LeadStatusOption[];
}) {
    const [pending, setPending] = useState(false);

    const change = (value: string) => {
        if (value === lead.status) {
            return;
        }

        setPending(true);
        router.patch(
            leadStatusRoute({ lead: lead.id }).url,
            { status: value },
            { preserveScroll: true, onFinish: () => setPending(false) },
        );
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                aria-label={`Changer le statut de ${lead.name}`}
                disabled={pending}
                className="rounded-full outline-none focus-visible:ring-2"
            >
                <Badge
                    variant="secondary"
                    data-status={lead.status}
                    className={cn(
                        'cursor-pointer gap-1 pr-1.5',
                        leadStatusClasses[lead.status],
                    )}
                >
                    {lead.status_label}
                    <ChevronDown className="size-3 opacity-70" />
                </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                <DropdownMenuLabel>Statut</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                    value={lead.status}
                    onValueChange={change}
                >
                    {statuses.map((option) => (
                        <DropdownMenuRadioItem
                            key={option.value}
                            value={option.value}
                        >
                            {option.label}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
