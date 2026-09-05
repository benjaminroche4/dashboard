import { router, usePage } from '@inertiajs/react';
import { UserRound } from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

/**
 * Avatar du responsable, cliquable pour attribuer le lead à un membre du staff.
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

    const change = (value: string) => {
        const userId = value === 'none' ? null : Number(value);

        if (userId === (lead.assignee?.id ?? null)) {
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
                className="rounded-full outline-none focus-visible:ring-2"
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
                            !lead.assignee &&
                                'bg-muted text-muted-foreground border border-dashed',
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
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Suivi par</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                    value={lead.assignee ? String(lead.assignee.id) : 'none'}
                    onValueChange={change}
                >
                    <DropdownMenuRadioItem value="none">
                        Personne
                    </DropdownMenuRadioItem>
                    {staff.map((member) => (
                        <DropdownMenuRadioItem
                            key={member.id}
                            value={String(member.id)}
                        >
                            {member.name}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
