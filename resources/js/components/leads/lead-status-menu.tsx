import { router } from '@inertiajs/react';
import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { status as leadStatusRoute } from '@/routes/leads';
import type { Lead, LeadStatus, LeadStatusOption } from '@/types';

// Couleurs personnalisées (pattern « Custom Colors » de shadcn Badge).
export const leadStatusClasses: Record<LeadStatus, string> = {
    todo: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
    in_progress: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    quote_sent:
        'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    converted:
        'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
    archived:
        'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400',
};

/** Point de couleur du statut, pour les listes. */
export const leadStatusDot: Record<LeadStatus, string> = {
    todo: 'bg-purple-500',
    in_progress: 'bg-sky-500',
    quote_sent: 'bg-amber-500',
    converted: 'bg-green-500',
    archived: 'bg-neutral-400',
};

/**
 * Badge de statut cliquable : le menu liste les statuts, point de couleur,
 * libellé et coche sur le statut actuel. Volontairement sobre.
 */
export function LeadStatusMenu({
    lead,
    statuses,
}: {
    lead: Pick<Lead, 'id' | 'name' | 'status' | 'status_label'>;
    statuses: LeadStatusOption[];
}) {
    const [pending, setPending] = useState(false);

    const change = (value: LeadStatus) => {
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
                className="max-w-full rounded-full outline-none focus-visible:ring-2"
            >
                <Badge
                    variant="secondary"
                    data-status={lead.status}
                    className={cn(
                        'max-w-full cursor-pointer gap-1 pr-1.5 transition-opacity hover:opacity-80',
                        leadStatusClasses[lead.status],
                    )}
                >
                    <span className="truncate">{lead.status_label}</span>
                    <ChevronDown className="size-3 shrink-0 opacity-70" />
                </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                className="w-48 rounded-lg p-1 shadow-md"
            >
                {statuses.map((option) => {
                    const current = option.value === lead.status;

                    return (
                        <DropdownMenuItem
                            key={option.value}
                            aria-current={current ? 'true' : undefined}
                            onSelect={() => change(option.value)}
                            className="gap-2.5 rounded-md px-2 py-1.5"
                        >
                            <span
                                aria-hidden
                                className={cn(
                                    'size-2 shrink-0 rounded-full',
                                    leadStatusDot[option.value],
                                )}
                            />
                            <span
                                className={cn(
                                    'flex-1 truncate text-sm',
                                    current && 'font-medium',
                                )}
                            >
                                {option.label}
                            </span>
                            <Check
                                aria-hidden
                                className={cn(
                                    'size-4 shrink-0',
                                    current ? 'opacity-100' : 'opacity-0',
                                )}
                            />
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
