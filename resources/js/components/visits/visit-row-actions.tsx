import { router, usePage } from '@inertiajs/react';
import { MoreHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
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
import { VisitReportDialog } from '@/components/visits/visit-report-dialog';
import { destroy, update } from '@/routes/clients/visits';
import type { Visit, VisitStatus } from '@/types';

/** Visite visée par le lien « Rédiger le compte rendu » de l'e-mail de rappel (`?report=UUID`). */
function reportRequested(uuid: string): boolean {
    try {
        return (
            new URLSearchParams(window.location.search).get('report') === uuid
        );
    } catch {
        return false;
    }
}

/**
 * Menu « … » d'une visite : compte rendu post-visite, marquer effectuée ou
 * annulée, replanifier, supprimer (admins, avec confirmation).
 */
export function VisitRowActions({ visit }: { visit: Visit }) {
    const { auth } = usePage().props;
    const canDelete = auth.user.role === 'admin';
    const [deleting, setDeleting] = useState(false);
    const [reporting, setReporting] = useState(false);
    const [busy, setBusy] = useState(false);

    // Depuis l'e-mail de rappel : le dialogue du compte rendu s'ouvre directement.
    useEffect(() => {
        if (reportRequested(visit.uuid)) {
            setReporting(true);
        }
    }, [visit.uuid]);

    const setStatus = (status: VisitStatus) =>
        router.patch(
            update({ visit: visit.uuid }).url,
            { status },
            { preserveScroll: true },
        );

    const remove = () => {
        setBusy(true);
        router.delete(destroy({ visit: visit.uuid }).url, {
            preserveScroll: true,
            onFinish: () => {
                setBusy(false);
                setDeleting(false);
            },
        });
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="size-8 p-0"
                        aria-label={`Actions pour la visite de ${visit.client.name}`}
                    >
                        <MoreHorizontal />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    {visit.status !== 'cancelled' && (
                        <DropdownMenuItem onSelect={() => setReporting(true)}>
                            {visit.report
                                ? 'Modifier le compte rendu'
                                : 'Rédiger le compte rendu'}
                        </DropdownMenuItem>
                    )}
                    {visit.status !== 'done' && (
                        <DropdownMenuItem onSelect={() => setStatus('done')}>
                            Marquer effectuée
                        </DropdownMenuItem>
                    )}
                    {visit.status !== 'cancelled' && (
                        <DropdownMenuItem
                            onSelect={() => setStatus('cancelled')}
                        >
                            Annuler la visite
                        </DropdownMenuItem>
                    )}
                    {visit.status !== 'planned' && (
                        <DropdownMenuItem onSelect={() => setStatus('planned')}>
                            Replanifier
                        </DropdownMenuItem>
                    )}
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

            <VisitReportDialog
                visit={visit}
                open={reporting}
                onOpenChange={setReporting}
            />

            <Dialog open={deleting} onOpenChange={setDeleting}>
                <DialogContent>
                    <DialogTitle>
                        Supprimer la visite de {visit.client.name} ?
                    </DialogTitle>
                    <DialogDescription>
                        La visite sera effacée. Le bien reste dans l’annuaire
                        des biens. Cette action est irréversible.
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
                            Supprimer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
