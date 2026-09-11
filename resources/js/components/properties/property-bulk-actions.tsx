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
import { bulkDestroy } from '@/routes/properties';
import type { Property } from '@/types';

/**
 * Actions groupées de l'annuaire des biens : suppression (admins) après
 * confirmation. Les visites et les photos des biens supprimés partent avec eux.
 */
export function PropertyBulkActions({
    properties,
    onDone,
}: {
    properties: Property[];
    /** Vide la sélection une fois l'action réussie. */
    onDone: () => void;
}) {
    const [deleting, setDeleting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const visits = properties.reduce(
        (total, property) => total + property.visits_count,
        0,
    );

    const destroy = () => {
        setDeleting(true);
        router.delete(bulkDestroy().url, {
            data: { ids: properties.map((property) => property.id) },
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
                Supprimer ({properties.length})
            </Button>
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Supprimer {properties.length} bien(s) ?
                        </DialogTitle>
                        <DialogDescription>
                            Leurs photos et leurs visites
                            {visits > 0 && ` (${visits} au total)`} seront
                            effacées. Cette action est irréversible.
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
