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
import { show as leadShow } from '@/routes/leads';
import { convert, destroy, show as ownerShow } from '@/routes/owners';
import type { Owner } from '@/types';

/**
 * Menu « … » d'un propriétaire : modifier, créer (ou ouvrir) son lead,
 * supprimer (admins, avec confirmation).
 */
export function OwnerRowActions({
    owner,
    onEdit,
}: {
    owner: Owner;
    onEdit: () => void;
}) {
    const { auth } = usePage().props;
    const canDelete = auth.user.role === 'admin';
    const [deleting, setDeleting] = useState(false);
    const [busy, setBusy] = useState(false);

    const remove = () => {
        setBusy(true);
        router.delete(destroy({ owner: owner.uuid }).url, {
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
                        aria-label={`Actions pour ${owner.name}`}
                    >
                        <MoreHorizontal />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                        <Link href={ownerShow({ owner: owner.uuid })}>
                            Voir la fiche
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={onEdit}>
                        Modifier
                    </DropdownMenuItem>
                    {owner.lead ? (
                        <DropdownMenuItem asChild>
                            <Link href={leadShow({ lead: owner.lead.uuid })}>
                                Ouvrir le lead {owner.lead.reference}
                            </Link>
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem
                            onSelect={() =>
                                router.post(
                                    convert({ owner: owner.uuid }).url,
                                    {},
                                    { preserveScroll: true },
                                )
                            }
                        >
                            Créer le lead
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

            <Dialog open={deleting} onOpenChange={setDeleting}>
                <DialogContent>
                    <DialogTitle>
                        Supprimer le propriétaire {owner.name} ?
                    </DialogTitle>
                    <DialogDescription>
                        Sa fiche sera effacée. Le lead éventuellement créé est
                        conservé. Cette action est irréversible.
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
