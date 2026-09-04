import { useOnlineStaff } from '@/hooks/use-online-staff';
import { useInitials } from '@/hooks/use-initials';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Avatars des membres du staff connectés en ce moment.
 */
export function OnlineStaff() {
    const members = useOnlineStaff();
    const getInitials = useInitials();

    if (members.length === 0) {
        return null;
    }

    return (
        <div
            className="flex items-center gap-2"
            aria-label={`${members.length} membre(s) en ligne`}
        >
            <span className="text-muted-foreground hidden text-xs sm:inline">
                En ligne
            </span>
            <div className="flex -space-x-2">
                {members.map((member) => (
                    <Tooltip key={member.id}>
                        <TooltipTrigger asChild>
                            <Avatar className="ring-background size-7 ring-2">
                                <AvatarFallback className="text-[10px]">
                                    {getInitials(member.name)}
                                </AvatarFallback>
                            </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>{member.name}</TooltipContent>
                    </Tooltip>
                ))}
            </div>
        </div>
    );
}
