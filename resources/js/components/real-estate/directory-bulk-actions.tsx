import { router } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';

/**
 * Actions groupées d'un annuaire (agents, agences) : suppression réservée aux
 * admins, après confirmation. Rien pour les autres membres.
 */
export function DirectoryBulkActions({
    ids,
    url,
    title,
    description,
    onDone,
    canDelete,
}: {
    /** Identifiants cochés. */
    ids: number[];
    /** Route de suppression groupée (DELETE). */
    url: string;
    title: string;
    description: string;
    /** Vide la sélection une fois l'action réussie. */
    onDone: () => void;
    canDelete: boolean;
}) {
    const [deleting, setDeleting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    if (!canDelete) {
        return null;
    }

    const destroy = () => {
        setDeleting(true);
        router.delete(url, {
            data: { ids },
            preserveScroll: true,
            onSuccess: () => {
                setConfirmOpen(false);
                onDone();
            },
            onFinish: () => setDeleting(false),
        });
    };

    return (
        <>
            <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => setConfirmOpen(true)}
            >
                <Trash2 aria-hidden />
                Supprimer ({ids.length})
            </Button>
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription>{description}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="secondary"
                            onClick={() => setConfirmOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={deleting}
                            onClick={destroy}
                        >
                            {deleting && <Spinner />}
                            Supprimer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
