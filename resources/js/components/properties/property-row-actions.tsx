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
import {
    destroy,
    edit as propertyEdit,
    show as propertyShow,
} from '@/routes/properties';
import type { Property } from '@/types';

/**
 * Menu « … » d'un bien : voir la fiche, modifier (page dédiée), ouvrir l'annonce, supprimer (admins, avec confirmation).
 */
export function PropertyRowActions({ property }: { property: Property }) {
    const { auth } = usePage().props;
    const canDelete = auth.user.role === 'admin';
    const [deleting, setDeleting] = useState(false);
    const [busy, setBusy] = useState(false);

    const remove = () => {
        setBusy(true);
        router.delete(destroy({ property: property.uuid }).url, {
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
                        aria-label={`Actions pour ${property.label}`}
                    >
                        <MoreHorizontal />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                        <Link href={propertyShow({ property: property.uuid })}>
                            Voir la fiche
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href={propertyEdit({ property: property.uuid })}>
                            Modifier
                        </Link>
                    </DropdownMenuItem>
                    {property.listing_url && (
                        <DropdownMenuItem asChild>
                            <a
                                href={property.listing_url}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Ouvrir l’annonce
                            </a>
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
                        Supprimer le bien {property.label} ?
                    </DialogTitle>
                    <DialogDescription>
                        Le bien et les visites qui lui sont rattachées seront
                        effacés. Cette action est irréversible.
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
