import { echo, echoIsConfigured } from '@laravel/echo-react';

export type PresenceMember = { id: number; name: string };

type Listener = () => void;

let members: PresenceMember[] = [];
let joined = false;
const listeners = new Set<Listener>();

function emit() {
    for (const listener of listeners) {
        listener();
    }
}

function setMembers(next: PresenceMember[]) {
    members = next;
    emit();
}

/**
 * Rejoint le canal de présence « staff » une seule fois pour toute la session.
 * Les composants lisent l'état via useSyncExternalStore (voir useOnlineStaff).
 */
export function ensurePresenceJoined(): void {
    if (joined || !echoIsConfigured()) {
        return;
    }

    joined = true;

    echo()
        .join('staff')
        .here((here: PresenceMember[]) => setMembers(here))
        .joining((member: PresenceMember) => {
            if (!members.some((m) => m.id === member.id)) {
                setMembers([...members, member]);
            }
        })
        .leaving((member: PresenceMember) =>
            setMembers(members.filter((m) => m.id !== member.id)),
        )
        .error(() => {
            // Sur erreur d'abonnement (Reverb indisponible), on retentera au prochain montage.
            joined = false;
        });
}

export function subscribePresence(listener: Listener): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

export function getPresenceSnapshot(): PresenceMember[] {
    return members;
}

/** Réservé aux tests. */
export function resetPresenceStore(): void {
    members = [];
    joined = false;
    listeners.clear();
}
