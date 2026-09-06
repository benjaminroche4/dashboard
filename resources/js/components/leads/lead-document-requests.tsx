import { Link } from '@inertiajs/react';
import { FilePlus2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    create as documentsCreate,
    show as documentsShow,
} from '@/routes/tools/documents';
import type { LeadDocumentRequest } from '@/types';

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

/**
 * Listes de documents rattachées à un lead : liste des listes générées et
 * création préremplie depuis la fiche.
 */
export function LeadDocumentRequests({
    leadId,
    requests,
}: {
    leadId: number;
    requests: LeadDocumentRequest[];
}) {
    return (
        <div className="grid gap-3" data-test="lead-document-requests">
            {requests.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                    Aucune liste de documents pour ce lead.
                </p>
            ) : (
                <ul role="list" className="grid gap-2">
                    {requests.map((request) => (
                        <li
                            key={request.id}
                            className="flex flex-wrap items-center justify-between gap-2 text-sm"
                        >
                            <Link
                                href={documentsShow({
                                    documentRequest: request.id,
                                })}
                                className="inline-flex min-w-0 items-center gap-1.5 font-medium underline-offset-4 hover:underline"
                            >
                                <FileText
                                    className="text-muted-foreground size-4 shrink-0"
                                    aria-hidden
                                />
                                {request.name}
                                <span className="text-muted-foreground truncate font-normal">
                                    ·{' '}
                                    {request.created_at
                                        ? dateFormat.format(
                                              new Date(request.created_at),
                                          )
                                        : '—'}
                                </span>
                            </Link>
                            <span className="text-muted-foreground tabular-nums">
                                {request.person_count} personne(s) ·{' '}
                                {request.document_count} pièce(s)
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            <div>
                <Button variant="outline" size="sm" asChild>
                    <Link href={documentsCreate({ query: { lead: leadId } })}>
                        <FilePlus2 aria-hidden />
                        Créer une liste de documents
                    </Link>
                </Button>
            </div>
        </div>
    );
}
