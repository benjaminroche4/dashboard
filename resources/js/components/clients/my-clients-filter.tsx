import { UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Client } from '@/types';

/** Vrai si le membre suit ce dossier, en premier ou en second. */
export function isFollowedBy(client: Client, userId: number): boolean {
    return client.assignee?.id === userId || client.co_assignee?.id === userId;
}

/** Bouton « Mes dossiers (n) » qui restreint la liste aux dossiers suivis. */
export function MyClientsFilter({
    active,
    onChange,
    count,
}: {
    active: boolean;
    onChange: (active: boolean) => void;
    /** Nombre de dossiers suivis, affiché entre parenthèses. */
    count: number;
}) {
    return (
        <Button
            type="button"
            variant="outline"
            // Même gabarit que « Favoris (n) » et le bouton « Filtres ».
            size="sm"
            aria-pressed={active}
            onClick={() => onChange(!active)}
            className={cn(
                active &&
                    'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
            )}
        >
            <UserRound aria-hidden />
            Mes dossiers ({count})
        </Button>
    );
}
