import { router } from '@inertiajs/react';
import {
    Archive,
    ArrowRightLeft,
    MoreHorizontal,
    Trash2,
    UserRoundPlus,
} from 'lucide-react';
import { useState } from 'react';
import {
    LeadArchiveDialog,
    type ArchiveChoice,
} from '@/components/leads/lead-archive-dialog';
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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    destroy as leadDestroy,
    segment as leadSegmentRoute,
    status as leadStatusRoute,
} from '@/routes/leads';
import { fromLead as ownerFromLead, show as ownerShow } from '@/routes/owners';
import type {
    LabeledOption,
    LeadDetail,
    LeadDirectoryOwner,
    LeadLossReason,
} from '@/types';

type Pending = 'archive' | 'delete' | null;

/**
 * Menu « ⋯ » de l'en-tête : déplacer le lead vers l'autre liste (locataires
 * ou propriétaires, confirmé par un toast), l'archiver et, pour les admins, le
 * supprimer. Archivage et suppression demandent confirmation.
 */
export function LeadHeaderMenu({
    lead,
    canDelete,
    lossReasons,
    directoryOwner = null,
}: {
    lead: LeadDetail;
    canDelete: boolean;
    lossReasons: LabeledOption<LeadLossReason>[];
    /** Fiche de l'annuaire déjà créée depuis ce lead, s'il y en a une. */
    directoryOwner?: LeadDirectoryOwner | null;
}) {
    const [pending, setPending] = useState<Pending>(null);
    const [busy, setBusy] = useState(false);
    const archived = lead.status === 'archived';
    const target = lead.segment === 'owner' ? 'tenant' : 'owner';
    const targetLabel =
        target === 'owner' ? 'Leads propriétaires' : 'Tous les leads';

    // Un lead propriétaire signé entre dans l'annuaire sans ressaisie.
    const addToDirectory = () => {
        setBusy(true);
        router.post(
            ownerFromLead({ lead: lead.uuid }).url,
            {},
            { onFinish: () => setBusy(false) },
        );
    };

    const move = () => {
        setBusy(true);
        router.patch(
            leadSegmentRoute({ lead: lead.uuid }).url,
            { segment: target },
            {
                // Le toast vient du serveur, comme pour toute mutation.
                preserveScroll: true,
                onFinish: () => setBusy(false),
            },
        );
    };

    const archive = ({ reason, note }: ArchiveChoice) => {
        setBusy(true);
        router.patch(
            leadStatusRoute({ lead: lead.uuid }).url,
            { status: 'archived', loss_reason: reason, loss_note: note },
            {
                preserveScroll: true,
                onFinish: () => {
                    setBusy(false);
                    setPending(null);
                },
            },
        );
    };
    const remove = () => {
        setBusy(true);
        router.delete(leadDestroy({ lead: lead.uuid }).url, {
            onFinish: () => setBusy(false),
        });
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="icon"
                        aria-label="Plus d’actions"
                    >
                        <MoreHorizontal aria-hidden />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {lead.segment === 'owner' && (
                        <DropdownMenuItem
                            // Ouvrir une fiche existante n'attend rien.
                            disabled={busy && directoryOwner === null}
                            onSelect={
                                directoryOwner
                                    ? () =>
                                          router.visit(
                                              ownerShow({
                                                  owner: directoryOwner.uuid,
                                              }).url,
                                          )
                                    : addToDirectory
                            }
                        >
                            <UserRoundPlus aria-hidden />
                            {directoryOwner
                                ? 'Voir la fiche de l’annuaire'
                                : 'Ajouter à l’annuaire des propriétaires'}
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem disabled={busy} onSelect={move}>
                        <ArrowRightLeft aria-hidden />
                        Déplacer vers « {targetLabel} »
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        disabled={archived}
                        onSelect={() => setPending('archive')}
                    >
                        <Archive aria-hidden />
                        {archived ? 'Déjà archivé' : 'Archiver le lead'}
                    </DropdownMenuItem>
                    {canDelete && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => setPending('delete')}
                            >
                                <Trash2 aria-hidden />
                                Supprimer le lead
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <LeadArchiveDialog
                leadName={lead.name}
                reasons={lossReasons}
                open={pending === 'archive'}
                onOpenChange={(open) => !open && setPending(null)}
                onConfirm={archive}
                busy={busy}
            />

            <Dialog
                open={pending === 'delete'}
                onOpenChange={(open) => !open && setPending(null)}
            >
                <DialogContent>
                    <DialogTitle>
                        Supprimer définitivement {lead.name} ?
                    </DialogTitle>
                    <DialogDescription>
                        Le lead, ses notes et son historique seront effacés.
                        Cette action est irréversible.
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
                            Supprimer le lead
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
