import { useEffect, useSyncExternalStore } from 'react';
import {
    ensurePresenceJoined,
    getPresenceSnapshot,
    subscribePresence,
    type PresenceMember,
} from '@/lib/presence-store';

export type OnlineStaffMember = PresenceMember;

/**
 * Membres du staff actuellement connectés au canal de présence.
 * Partagé entre tous les composants, mis à jour en direct.
 */
export function useOnlineStaff(): OnlineStaffMember[] {
    useEffect(() => {
        ensurePresenceJoined();
    }, []);

    return useSyncExternalStore(
        subscribePresence,
        getPresenceSnapshot,
        getPresenceSnapshot,
    );
}
