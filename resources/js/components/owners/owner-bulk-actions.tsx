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
import { bulkDestroy } from '@/routes/owners';
import type { Owner } from '@/types';

/**
 * Actions groupées de la liste des propriétaires : suppression (admins) après
 * confirmation. Rien pour les autres membres.
 */
export function OwnerBulkActions({
    owners,
    onDone,
    canDelete,
}: {
    owners: Owner[];
    /** Vide la sélection une fois l'action réussie. */
    onDone: () => void;
    /** Admins seulement. */
    canDelete: boolean;
}) {
    const [deleting, setDeleting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    if (!canDelete) {
        return null;
    }

    const destroy = () => {
        setDeleting(true);
        router.delete(bulkDestroy().url, {
            data: { ids: owners.map((owner) => owner.id) },
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
                Supprimer ({owners.length})
            </Button>
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Supprimer {owners.length} propriétaire(s) ?
                        </DialogTitle>
                        <DialogDescription>
                            Leurs fiches seront effacées. Les biens rattachés
                            sont conservés, sans propriétaire. Cette action est
                            irréversible.
                        </DialogDescription>
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
