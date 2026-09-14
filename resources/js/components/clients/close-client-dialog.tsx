import { router } from '@inertiajs/react';
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
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { close as closeClient } from '@/routes/clients';
import type { ClientClosingReason, LabeledOption } from '@/types';

/**
 * Clôturer un dossier : il passe en « Archivé » avec le motif de la fin —
 * installé, parti, sans logement. Même geste que l'archivage d'un lead, mais
 * avec les raisons d'un client accompagné, pas celles d'un prospect perdu.
 */
export function CloseClientDialog({
    clientUuid,
    clientName,
    reasons,
    open,
    onOpenChange,
}: {
    clientUuid: string;
    clientName: string;
    reasons: LabeledOption<ClientClosingReason>[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [reason, setReason] = useState<ClientClosingReason | ''>('');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);

    // Chaque ouverture repart à blanc.
    useEffect(() => {
        if (open) {
            setReason('');
            setNote('');
        }
    }, [open]);

    const confirm = () => {
        if (reason === '') {
            return;
        }

        setBusy(true);
        router.post(
            closeClient({ lead: clientUuid }).url,
            { reason, note: note.trim() || null },
            {
                preserveScroll: true,
                onSuccess: () => onOpenChange(false),
                onFinish: () => setBusy(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>Clôturer le dossier {clientName} ?</DialogTitle>
                <DialogDescription>
                    Le dossier passe dans les archives : il se lit encore, ne se
                    modifie plus, et peut être rouvert.
                </DialogDescription>
                <RadioGroup
                    aria-label="Motif de clôture"
                    value={reason}
                    onValueChange={(value) =>
                        setReason(value as ClientClosingReason)
                    }
                    className="grid gap-2"
                >
                    {reasons.map((option) => (
                        <Label
                            key={option.value}
                            htmlFor={`closing-${option.value}`}
                            className="bg-background has-data-[state=checked]:border-primary flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 font-normal"
                        >
                            <RadioGroupItem
                                id={`closing-${option.value}`}
                                value={option.value}
                                aria-label={option.label}
                            />
                            {option.label}
                        </Label>
                    ))}
                </RadioGroup>
                <div className="grid gap-1.5">
                    <Label htmlFor="closing-note">Précision (facultatif)</Label>
                    <Textarea
                        id="closing-note"
                        rows={2}
                        maxLength={500}
                        placeholder="Ex. installé rue de Richelieu, bail signé le 12…"
                        className="bg-background"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                    />
                </div>
                <DialogFooter className="gap-2">
                    <DialogClose asChild>
                        <Button variant="secondary">Annuler</Button>
                    </DialogClose>
                    <Button disabled={busy || reason === ''} onClick={confirm}>
                        {busy && <Spinner />}
                        Clôturer le dossier
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
