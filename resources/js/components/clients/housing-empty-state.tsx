import { House, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Onglet « Logement du client » sans rien dedans : ni logement retenu, ni
 * logement proposé. Un bandeau — pictogramme, ce qui se passera ensuite, et
 * le bouton « Proposer un logement » de l'onglet. Retenu parmi cinq variantes.
 */
export function HousingEmptyState({
    onPropose,
    canPropose,
}: {
    onPropose: () => void;
    /** Faux quand l'annuaire n'a plus rien à proposer à ce client. */
    canPropose: boolean;
}) {
    return (
        <div className="bg-sidebar flex flex-wrap items-center gap-4 rounded-lg border p-4">
            <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
                <House className="size-5" aria-hidden />
            </span>
            <div className="grid min-w-0 flex-1 gap-0.5">
                <p className="text-sm font-medium">
                    Aucun logement proposé pour l'instant
                </p>
                <p className="text-muted-foreground text-xs">
                    Un bien de l’annuaire, une visite, puis le bail : le
                    logement retenu s’affichera ici.
                </p>
                {!canPropose && (
                    <p className="text-muted-foreground text-xs">
                        Tous les logements de l’annuaire sont déjà proposés à ce
                        client, ou l’annuaire est vide.
                    </p>
                )}
            </div>
            <Button
                variant="outline"
                size="sm"
                onClick={onPropose}
                disabled={!canPropose}
            >
                <Link2 aria-hidden />
                Proposer un logement
            </Button>
        </div>
    );
}
