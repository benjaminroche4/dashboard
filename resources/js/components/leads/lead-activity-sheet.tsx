import { History } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';

/**
 * Bouton « Voir l'activité » de la fiche lead : ouvre un volet latéral
 * avec les filtres, le fil d'activité et la saisie d'une note.
 */
export function LeadActivitySheet({
    count,
    filters,
    composer,
    children,
}: {
    count: number;
    /** Filtres Tout / Notes / Envois / Statuts. */
    filters?: ReactNode;
    /** Zone de saisie d'une note, en bas du volet. */
    composer?: ReactNode;
    /** Fil d'activité. */
    children: ReactNode;
}) {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" className="w-full justify-center">
                    <History aria-hidden />
                    Voir l’activité
                </Button>
            </SheetTrigger>
            <SheetContent className="gap-0 sm:max-w-lg">
                <SheetHeader className="border-b">
                    <div className="flex items-center gap-2">
                        <SheetTitle>Activité</SheetTitle>
                        <Badge
                            variant="secondary"
                            className="font-medium tabular-nums"
                            aria-label={`${count} ${count > 1 ? 'entrées' : 'entrée'}`}
                        >
                            {count}
                        </Badge>
                    </div>
                    <SheetDescription>
                        Notes internes, envois au lead et changements de statut.
                    </SheetDescription>
                    {filters}
                </SheetHeader>
                <div className="flex min-h-0 flex-1 flex-col justify-end px-4 pt-2">
                    {children}
                </div>
                {composer && <div className="border-t p-4">{composer}</div>}
            </SheetContent>
        </Sheet>
    );
}
