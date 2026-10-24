import { useOnlineStaff } from '@/hooks/use-online-staff';
import { useInitials } from '@/hooks/use-initials';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
        <Tooltip>
            <TooltipTrigger asChild>
                <div
                    className="flex items-center"
                    aria-label={`${members.length} membre(s) en ligne`}
                >
                    <div className="flex -space-x-2">
                        {members.map((member) => (
                            // L'avatar est en `overflow-hidden` : la pastille vit
                            // sur une enveloppe pour dépasser du cercle.
                            <span
                                key={member.id}
                                className="relative inline-flex"
                            >
                                <Avatar className="ring-background size-7 ring-2">
                                    <AvatarImage
                                        src={member.avatar ?? undefined}
                                        alt=""
                                    />
                                    <AvatarFallback className="text-[10px]">
                                        {getInitials(member.name)}
                                    </AvatarFallback>
                                </Avatar>
                                {/* En ligne : une pastille verte en bas à droite,
                                    cerclée du fond pour se détacher de l'avatar. */}
                                <span
                                    data-testid="online-dot"
                                    aria-hidden="true"
                                    className="ring-background absolute right-0 bottom-0 size-2 rounded-full bg-emerald-500 ring-2"
                                />
                            </span>
                        ))}
                    </div>
                </div>
            </TooltipTrigger>
            {/* Une seule infobulle pour la pile : tous les connectés d'un coup. */}
            <TooltipContent>
                <ul aria-label="Membres en ligne" className="grid gap-1">
                    {members.map((member) => (
                        <li key={member.id} className="flex items-center gap-2">
                            <span
                                aria-hidden="true"
                                className="size-1.5 rounded-full bg-emerald-400"
                            />
                            {member.name}
                        </li>
                    ))}
                </ul>
            </TooltipContent>
        </Tooltip>
    );
}
