import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

/**
 * « créée par Admin le 6 septembre 2026 » avec l'avatar du membre devant
 * son nom. `date` accepte une date ISO ou un horodatage.
 */
export function CreatedBy({
    name,
    avatar,
    date,
    verb = 'créée par',
}: {
    name: string | null;
    avatar?: string | null;
    date?: string | null;
    verb?: string;
}) {
    const initials = useInitials();
    const label = name ?? 'inconnu';

    return (
        <span className="inline-flex items-center gap-1.5 align-middle">
            {verb}
            <Avatar className="size-5">
                {avatar && <AvatarImage src={avatar} alt="" />}
                <AvatarFallback className="text-[10px]">
                    {initials(label)}
                </AvatarFallback>
            </Avatar>
            <span>{label}</span>
            {date && (
                <span>
                    le{' '}
                    <time dateTime={date}>
                        {dateFormat.format(new Date(date))}
                    </time>
                </span>
            )}
        </span>
    );
}
