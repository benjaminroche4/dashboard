import { router } from '@inertiajs/react';
import { ChevronDown, Tags } from 'lucide-react';
import { useState } from 'react';
import {
    LeadArchiveDialog,
    type ArchiveChoice,
} from '@/components/leads/lead-archive-dialog';
import { leadStatusDot } from '@/components/leads/lead-status-menu';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { bulkStatus } from '@/routes/leads';
import type {
    LabeledOption,
    Lead,
    LeadLossReason,
    LeadStatus,
    LeadStatusOption,
} from '@/types';

type Props = {
    /** Leads cochés dans le tableau. */
    leads: Lead[];
    statuses: LeadStatusOption[];
    lossReasons: LabeledOption<LeadLossReason>[];
    /** Vide la sélection une fois le changement enregistré. */
    onDone: () => void;
};

/**
 * Actions groupées du tableau des leads : un menu « Statut » qui passe tous
 * les leads cochés dans le même statut. L'archivage demande **un seul motif
 * de perte pour le groupe** (une modale par lead aurait été une modale par
 * ligne, 28 octobre 2026) ; les leads déjà dans le statut sont laissés tels
 * quels, et le serveur nomme ceux qu'il a dû ignorer.
 */
export function LeadBulkActions({
    leads,
    statuses,
    lossReasons,
    onDone,
}: Props) {
    const [pending, setPending] = useState(false);
    const [archiving, setArchiving] = useState(false);

    const patch = (payload: Record<string, string | number[]>) => {
        setPending(true);
        router.patch(
            bulkStatus().url,
            { ids: leads.map((lead) => lead.id), ...payload },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setArchiving(false);
                    onDone();
                },
                onFinish: () => setPending(false),
            },
        );
    };

    const change = (status: LeadStatus) => {
        if (status === 'archived' && lossReasons.length > 0) {
            setArchiving(true);

            return;
        }

        patch({ status });
    };

    const confirmArchive = ({ reason, note }: ArchiveChoice) =>
        patch({ status: 'archived', loss_reason: reason, loss_note: note });

    const label = `${leads.length} lead${leads.length > 1 ? 's' : ''}`;

    return (
        <div
            role="group"
            aria-label="Actions groupées"
            className="flex flex-wrap items-center gap-2"
        >
            <LeadArchiveDialog
                leadName={label}
                count={leads.length}
                reasons={lossReasons}
                open={archiving}
                onOpenChange={setArchiving}
                onConfirm={confirmArchive}
                busy={pending}
            />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" disabled={pending}>
                        {pending ? <Spinner /> : <Tags />}
                        Statut ({leads.length})
                        <ChevronDown className="opacity-70" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-56">
                    <DropdownMenuLabel>Passer {label} en</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {statuses.map((option) => (
                        <DropdownMenuItem
                            key={option.value}
                            onSelect={() => change(option.value)}
                        >
                            <span
                                aria-hidden
                                className={cn(
                                    'size-2 shrink-0 rounded-full',
                                    leadStatusDot[option.value],
                                )}
                            />
                            {option.label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
