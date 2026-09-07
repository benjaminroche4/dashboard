import { router, usePage } from '@inertiajs/react';
import { Check, UserRound, UserRoundX } from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

/**
 * Avatar du responsable, cliquable : le menu liste le staff (avatar, nom),
 * une coche sur le responsable actuel, et « Personne ». Volontairement sobre.
 */
export function LeadAssignMenu({
    lead,
    size = 'sm',
}: {
    lead: Pick<Lead, 'id' | 'uuid' | 'name' | 'assignee'>;
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
            leadAssign({ lead: lead.uuid }).url,
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
                    {lead.assignee?.avatar && (
                        <AvatarImage src={lead.assignee.avatar} alt="" />
                    )}
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
            <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                    Suivi par
                </DropdownMenuLabel>
                {staff.map((member) => {
                    const current = member.id === currentId;

                    return (
                        <DropdownMenuItem
                            key={member.id}
                            aria-current={current ? 'true' : undefined}
                            onSelect={() => change(member.id)}
                        >
                            <Avatar className="size-6">
                                {member.avatar && (
                                    <AvatarImage src={member.avatar} alt="" />
                                )}
                                <AvatarFallback
                                    className={cn(
                                        'text-[10px] font-medium',
                                        memberTone(member.id),
                                    )}
                                >
                                    {initials(member.name)}
                                </AvatarFallback>
                            </Avatar>
                            <span
                                className={cn(
                                    'flex-1 truncate text-sm',
                                    current && 'font-medium',
                                )}
                            >
                                {member.name}
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
                >
                    <span className="bg-muted text-muted-foreground flex size-6 items-center justify-center rounded-full border border-dashed">
                        <UserRoundX className="size-3" aria-hidden />
                    </span>
                    <span
                        className={cn(
                            'flex-1 text-sm',
                            currentId === null && 'font-medium',
                        )}
                    >
                        Personne
                    </span>
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
