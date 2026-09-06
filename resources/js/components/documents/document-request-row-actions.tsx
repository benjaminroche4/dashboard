import { Link, router, usePage } from '@inertiajs/react';
import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { downloadDocumentRequestPdf } from '@/lib/download-document-request-pdf';
import { destroy, edit, show } from '@/routes/tools/documents';
import type { DocumentRequestSummary } from '@/types';

/**
 * Menu « … » d'une liste de pièces : voir, modifier, PDF, supprimer (admins).
 * `hideView` sur la fiche, où « Voir » n'a pas de sens.
 */
export function DocumentRequestRowActions({
    request,
    hideView = false,
}: {
    request: DocumentRequestSummary;
    hideView?: boolean;
}) {
    const { auth } = usePage().props;
    const canDelete = auth.user.role === 'admin';
    const [deleting, setDeleting] = useState(false);
    const [busy, setBusy] = useState(false);

    const remove = () => {
        setBusy(true);
        router.delete(destroy({ documentRequest: request.id }).url, {
            onFinish: () => setBusy(false),
        });
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="size-8 p-0"
                        aria-label={`Actions pour ${request.name}`}
                    >
                        <MoreHorizontal />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    {!hideView && (
                        <DropdownMenuItem asChild>
                            <Link href={show({ documentRequest: request.id })}>
                                Voir la liste
                            </Link>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                        <Link href={edit({ documentRequest: request.id })}>
                            Modifier
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() =>
                            downloadDocumentRequestPdf(request.id, request.name)
                        }
                    >
                        Télécharger le PDF
                    </DropdownMenuItem>
                    {canDelete && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => setDeleting(true)}
                            >
                                Supprimer
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={deleting} onOpenChange={setDeleting}>
                <DialogContent>
                    <DialogTitle>
                        Supprimer la liste de {request.name} ?
                    </DialogTitle>
                    <DialogDescription>
                        La liste de pièces sera effacée. Cette action est
                        irréversible.
                    </DialogDescription>
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button variant="secondary">Annuler</Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            disabled={busy}
                            onClick={remove}
                        >
                            Supprimer la liste
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
