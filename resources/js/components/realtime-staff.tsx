import { useStaffChannel } from '@/hooks/use-staff-channel';

/**
 * Monté une fois dans le layout authentifié : toasts + rechargement
 * des props Inertia à chaque action d'un autre membre du staff.
 */
export function RealtimeStaff() {
    useStaffChannel();

    return null;
}
