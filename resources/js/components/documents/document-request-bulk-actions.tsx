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
import { bulkDestroy } from '@/routes/tools/documents';
import type { DocumentRequestSummary } from '@/types';

type Props = {
    requests: DocumentRequestSummary[];
    /** Vide la sélection une fois l'action réussie. */
    onDone: () => void;
    /** Admins seulement : la suppression groupée. */
    canDelete: boolean;
};

/**
 * Actions groupées de la liste des demandes de pièces : suppression (admins)
 * après confirmation. Rien pour les autres membres : la sélection ne sert
 * qu'aux admins.
 */
export function DocumentRequestBulkActions({
    requests,
    onDone,
    canDelete,
}: Props) {
    const [deleting, setDeleting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const destroy = () => {
        setDeleting(true);
        router.delete(bulkDestroy().url, {
            data: { ids: requests.map((request) => request.id) },
            preserveScroll: true,
            onSuccess: () => {
                setConfirmOpen(false);
                onDone();
            },
            onFinish: () => setDeleting(false),
        });
    };

    if (!canDelete) {
        return null;
    }

    return (
        <div
            role="group"
            aria-label="Actions groupées"
            className="flex flex-wrap items-center gap-2"
        >
            <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:text-red-700 dark:text-red-400"
                onClick={() => setConfirmOpen(true)}
                disabled={deleting}
            >
                <Trash2 />
                Supprimer ({requests.length})
            </Button>
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>
                            Supprimer {requests.length} demande(s) ?
                        </DialogTitle>
                        <DialogDescription>
                            Les demandes cochées seront supprimées
                            définitivement. Cette action est irréversible.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setConfirmOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={destroy}
                            disabled={deleting}
                        >
                            {deleting && <Spinner />}
                            Supprimer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
