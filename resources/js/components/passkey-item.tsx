import { KeyRound, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import type { Passkey } from '@/types/auth';

type Props = {
    passkey: Passkey;
    onDelete: (id: number, onError: () => void) => void;
};

export default function PasskeyItem({ passkey, onDelete }: Props) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = () => {
        setIsDeleting(true);
        onDelete(passkey.id, () => setIsDeleting(false));
    };

    return (
        <li className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-3">
                <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <KeyRound
                        className="text-muted-foreground size-4"
                        aria-hidden
                    />
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">
                            {passkey.name}
                        </p>
                        {passkey.authenticator && (
                            <span className="bg-muted text-muted-foreground ring-border inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase ring-1 ring-inset">
                                {passkey.authenticator}
                            </span>
                        )}
                    </div>
                    <p className="text-muted-foreground truncate text-xs">
                        Ajoutée {passkey.created_at_diff}
                        {passkey.last_used_at_diff && (
                            <>
                                {' '}
                                · Dernière utilisation{' '}
                                {passkey.last_used_at_diff}
                            </>
                        )}
                    </p>
                </div>
            </div>

            <Dialog>
                <DialogTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        aria-label={`Supprimer la clé d’accès ${passkey.name}`}
                    >
                        <Trash2 aria-hidden />
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogTitle>Supprimer la clé d’accès</DialogTitle>
                    <DialogDescription>
                        Voulez-vous vraiment supprimer la clé d’accès «{' '}
                        {passkey.name} » ? Vous ne pourrez plus l’utiliser pour
                        vous connecter.
                    </DialogDescription>
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button variant="secondary">Annuler</Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting
                                ? 'Suppression…'
                                : 'Supprimer la clé d’accès'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </li>
    );
}
