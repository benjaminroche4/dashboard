import { usePresenceChannel } from '@laravel/echo-react';
import { useEffect, useState } from 'react';

export type OnlineStaffMember = { id: number; name: string };

/**
 * Liste des membres du staff actuellement connectés au canal de présence.
 */
export function useOnlineStaff(): OnlineStaffMember[] {
    const { channel } = usePresenceChannel('staff');
    const [members, setMembers] = useState<OnlineStaffMember[]>([]);

    useEffect(() => {
        const presence = channel();

        if (!presence) {
            return;
        }

        presence
            .here((here: OnlineStaffMember[]) => setMembers(here))
            .joining((member: OnlineStaffMember) =>
                setMembers((current) =>
                    current.some((m) => m.id === member.id)
                        ? current
                        : [...current, member],
                ),
            )
            .leaving((member: OnlineStaffMember) =>
                setMembers((current) =>
                    current.filter((m) => m.id !== member.id),
                ),
            );
    }, [channel]);

    return members;
}
