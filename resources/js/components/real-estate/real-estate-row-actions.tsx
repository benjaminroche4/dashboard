import { router, usePage } from '@inertiajs/react';
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

/**
 * Menu « … » d'une ligne agent ou agence : modifier, supprimer (admins,
 * avec confirmation).
 */
export function RealEstateRowActions({
    name,
    deleteUrl,
    deleteTitle,
    deleteDescription,
    onEdit,
}: {
    name: string;
    deleteUrl: string;
    deleteTitle: string;
    deleteDescription: string;
    onEdit: () => void;
}) {
    const { auth } = usePage().props;
    const canDelete = auth.user.role === 'admin';
    const [deleting, setDeleting] = useState(false);
    const [busy, setBusy] = useState(false);

    const remove = () => {
        setBusy(true);
        router.delete(deleteUrl, {
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
                        aria-label={`Actions pour ${name}`}
                    >
                        <MoreHorizontal />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={onEdit}>
                        Modifier
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
                    <DialogTitle>{deleteTitle}</DialogTitle>
                    <DialogDescription>{deleteDescription}</DialogDescription>
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
