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
import type { LabeledOption, LeadLossReason } from '@/types';

export type ArchiveChoice = { reason: LeadLossReason; note: string };

/**
 * À l'archivage d'un lead : pourquoi il n'a pas abouti. Le motif est
 * obligatoire, la précision libre. Utilisé par le menu de statut, le kanban
 * et le menu « ⋯ » de la fiche.
 */
export function LeadArchiveDialog({
    leadName,
    reasons,
    open,
    onOpenChange,
    onConfirm,
    busy = false,
}: {
    leadName: string;
    reasons: LabeledOption<LeadLossReason>[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (choice: ArchiveChoice) => void;
    busy?: boolean;
}) {
    const [reason, setReason] = useState<LeadLossReason | ''>('');
    const [note, setNote] = useState('');

    // Chaque ouverture repart à blanc.
    useEffect(() => {
        if (open) {
            setReason('');
            setNote('');
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>Archiver {leadName}</DialogTitle>
                <DialogDescription>
                    Pourquoi ce lead n’a-t-il pas abouti ? Le motif sert à
                    comprendre le pipeline.
                </DialogDescription>
                <RadioGroup
                    aria-label="Motif"
                    value={reason}
                    onValueChange={(value) =>
                        setReason(value as LeadLossReason)
                    }
                    className="grid gap-2"
                >
                    {reasons.map((option) => (
                        <Label
                            key={option.value}
                            htmlFor={`loss-${option.value}`}
                            className="bg-background has-data-[state=checked]:border-primary flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 font-normal"
                        >
                            <RadioGroupItem
                                id={`loss-${option.value}`}
                                value={option.value}
                                aria-label={option.label}
                            />
                            {option.label}
                        </Label>
                    ))}
                </RadioGroup>
                <div className="grid gap-1.5">
                    <Label htmlFor="loss-note">Précision (facultatif)</Label>
                    <Textarea
                        id="loss-note"
                        rows={2}
                        maxLength={500}
                        placeholder="Ex. budget à 900 €, a signé avec une agence…"
                        className="bg-background"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                    />
                </div>
                <DialogFooter className="gap-2">
                    <DialogClose asChild>
                        <Button variant="secondary">Annuler</Button>
                    </DialogClose>
                    <Button
                        disabled={busy || reason === ''}
                        onClick={() =>
                            reason !== '' && onConfirm({ reason, note })
                        }
                    >
                        {busy && <Spinner />}
                        Archiver
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
