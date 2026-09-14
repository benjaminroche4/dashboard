import { Link, router, usePage } from '@inertiajs/react';
import { Archive, ArchiveRestore, Eye, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { CloseClientDialog } from '@/components/clients/close-client-dialog';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { reopen as reopenClient, show as clientShow } from '@/routes/clients';
import type { Client, ClientClosingReason, LabeledOption } from '@/types';

/**
 * Menu « ⋯ » d'une ligne de la liste des dossiers : voir, et clôturer (ou
 * rouvrir un dossier archivé). Les motifs viennent des props de la page.
 */
export function ClientRowActions({ client }: { client: Client }) {
    const [closing, setClosing] = useState(false);
    const reasons =
        (usePage().props.closingReasons as
            | LabeledOption<ClientClosingReason>[]
            | undefined) ?? [];
    const closed = client.closed_at !== null;

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Actions pour ${client.name}`}
                    >
                        <MoreHorizontal aria-hidden />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                        <Link href={clientShow({ lead: client.uuid })}>
                            <Eye />
                            Voir le dossier
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {closed ? (
                        <DropdownMenuItem
                            onSelect={() =>
                                router.post(
                                    reopenClient({ lead: client.uuid }).url,
                                    {},
                                    { preserveScroll: true },
                                )
                            }
                        >
                            <ArchiveRestore />
                            Rouvrir le dossier
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem onSelect={() => setClosing(true)}>
                            <Archive />
                            Clôturer le dossier
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
            <CloseClientDialog
                clientUuid={client.uuid}
                clientName={client.name}
                reasons={reasons}
                open={closing}
                onOpenChange={setClosing}
            />
        </>
    );
}
