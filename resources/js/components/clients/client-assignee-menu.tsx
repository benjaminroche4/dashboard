import { router, usePage } from '@inertiajs/react';
import { Check, ChevronDown, UserRound, UserRoundX } from 'lucide-react';
import { useState } from 'react';
import { initials, memberTone } from '@/components/leads/lead-assign-menu';
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

/**
 * Qui suit le dossier, dans l'en-tête : le nom se lit, et se change sur place
 * — c'est là qu'on se pose la question, pas dans l'onglet « Personnes ». Le
 * second membre du suivi reste géré par le dialogue de cet onglet.
 */
export function ClientAssigneeMenu({
    clientUuid,
    clientName,
    assignee,
}: {
    clientUuid: string;
    clientName: string;
    assignee: { id: number; name: string; avatar: string | null } | null;
}) {
    const { staff } = usePage().props;
    const [pending, setPending] = useState(false);

    const change = (userId: number | null) => {
        if (userId === (assignee?.id ?? null)) {
            return;
        }

        setPending(true);
        router.patch(
            leadAssign({ lead: clientUuid }).url,
            { user_id: userId },
            { preserveScroll: true, onFinish: () => setPending(false) },
        );
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                disabled={pending}
                aria-label={
                    assignee
                        ? `Suivi par ${assignee.name}, changer`
                        : `Attribuer le dossier de ${clientName}`
                }
                className="hover:text-foreground inline-flex items-center gap-1.5 rounded-md align-middle transition-colors outline-none focus-visible:ring-2"
            >
                <Avatar className="size-5">
                    {assignee?.avatar && (
                        <AvatarImage src={assignee.avatar} alt="" />
                    )}
                    <AvatarFallback
                        className={cn(
                            'text-[10px]',
                            assignee
                                ? memberTone(assignee.id)
                                : 'bg-muted text-muted-foreground border border-dashed',
                        )}
                    >
                        {assignee ? (
                            initials(assignee.name)
                        ) : (
                            <UserRound className="size-3" aria-hidden />
                        )}
                    </AvatarFallback>
                </Avatar>
                {assignee ? assignee.name : 'non attribué'}
                <ChevronDown className="size-3.5 opacity-60" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                    Qui suit le dossier
                </DropdownMenuLabel>
                {staff.map((member) => (
                    <DropdownMenuItem
                        key={member.id}
                        aria-current={
                            member.id === assignee?.id ? 'true' : undefined
                        }
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
                        <span className="truncate">{member.name}</span>
                        {member.id === assignee?.id && (
                            <Check className="ml-auto size-4" aria-hidden />
                        )}
                    </DropdownMenuItem>
                ))}
                {assignee && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => change(null)}>
                            <UserRoundX aria-hidden />
                            Retirer du suivi
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
