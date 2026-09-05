import { router, usePage } from '@inertiajs/react';
import { Check, UserRound, UserRoundX } from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { assign as leadAssign } from '@/routes/leads';
import type { Lead } from '@/types';

export function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
}

// Une teinte stable par membre, dérivée de son identifiant.
const palette = [
    'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
    'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
    'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
    'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200',
];

export const memberTone = (id: number) => palette[id % palette.length];

const roleLabels: Record<string, string> = {
    admin: 'Administrateur',
    manager: 'Manager',
    member: 'Membre',
};

/**
 * Avatar du responsable, cliquable : le menu liste le staff avec avatar,
 * nom et rôle, une coche sur le responsable actuel, et « Personne ».
 */
export function LeadAssignMenu({
    lead,
    size = 'sm',
}: {
    lead: Pick<Lead, 'id' | 'name' | 'assignee'>;
    size?: 'sm' | 'md';
}) {
    const { staff } = usePage().props;
    const [pending, setPending] = useState(false);
    const currentId = lead.assignee?.id ?? null;

    const change = (userId: number | null) => {
        if (userId === currentId) {
            return;
        }

        setPending(true);
        router.patch(
            leadAssign({ lead: lead.id }).url,
            { user_id: userId },
            { preserveScroll: true, onFinish: () => setPending(false) },
        );
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                aria-label={
                    lead.assignee
                        ? `Suivi par ${lead.assignee.name}, changer`
                        : `Attribuer ${lead.name}`
                }
                title={
                    lead.assignee
                        ? `Suivi par ${lead.assignee.name}`
                        : 'Non attribué'
                }
                disabled={pending}
                className="rounded-full transition-opacity outline-none hover:opacity-80 focus-visible:ring-2"
            >
                <Avatar
                    className={cn(
                        'ring-background ring-2',
                        size === 'sm' ? 'size-6' : 'size-8',
                    )}
                >
                    <AvatarFallback
                        className={cn(
                            size === 'sm' ? 'text-[10px]' : 'text-xs',
                            lead.assignee
                                ? memberTone(lead.assignee.id)
                                : 'bg-muted text-muted-foreground border border-dashed',
                        )}
                    >
                        {lead.assignee ? (
                            initials(lead.assignee.name)
                        ) : (
                            <UserRound className="size-3" aria-hidden />
                        )}
                    </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-1.5">
                <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                    Responsable du suivi de {lead.name}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {staff.map((member) => {
                    const current = member.id === currentId;

                    return (
                        <DropdownMenuItem
                            key={member.id}
                            aria-current={current ? 'true' : undefined}
                            onSelect={() => change(member.id)}
                            className={cn(
                                'gap-2.5 rounded-md py-1.5',
                                current && 'bg-accent/60',
                            )}
                        >
                            <Avatar className="size-7">
                                <AvatarFallback
                                    className={cn(
                                        'text-[11px] font-medium',
                                        memberTone(member.id),
                                    )}
                                >
                                    {initials(member.name)}
                                </AvatarFallback>
                            </Avatar>
                            <span className="grid min-w-0 flex-1">
                                <span className="truncate text-sm">
                                    {member.name}
                                </span>
                                <span className="text-muted-foreground truncate text-xs">
                                    {roleLabels[member.role] ?? member.role}
                                </span>
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
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    aria-current={currentId === null ? 'true' : undefined}
                    onSelect={() => change(null)}
                    className="gap-2.5 rounded-md py-1.5"
                >
                    <span className="bg-muted text-muted-foreground flex size-7 items-center justify-center rounded-full border border-dashed">
                        <UserRoundX className="size-3.5" aria-hidden />
                    </span>
                    <span className="flex-1 text-sm">Personne</span>
                    <Check
                        aria-hidden
                        className={cn(
                            'size-4 shrink-0',
                            currentId === null ? 'opacity-100' : 'opacity-0',
                        )}
                    />
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
