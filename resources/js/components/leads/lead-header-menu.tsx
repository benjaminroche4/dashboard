import { router } from '@inertiajs/react';
import { Archive, ArrowRightLeft, MoreHorizontal, Trash2 } from 'lucide-react';
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
import { notify } from '@/lib/toast';
import {
    destroy as leadDestroy,
    segment as leadSegmentRoute,
    status as leadStatusRoute,
} from '@/routes/leads';
import type { LabeledOption, LeadDetail, LeadLossReason } from '@/types';

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
}: {
    lead: LeadDetail;
    canDelete: boolean;
    lossReasons: LabeledOption<LeadLossReason>[];
}) {
    const [pending, setPending] = useState<Pending>(null);
    const [busy, setBusy] = useState(false);
    const archived = lead.status === 'archived';
    const target = lead.segment === 'owner' ? 'tenant' : 'owner';
    const targetLabel =
        target === 'owner' ? 'Leads propriétaires' : 'Tous les leads';

    const move = () => {
        setBusy(true);
        router.patch(
            leadSegmentRoute({ lead: lead.uuid }).url,
            { segment: target },
            {
                preserveScroll: true,
                onSuccess: () =>
                    notify.success(`Lead déplacé dans « ${targetLabel} ».`),
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
