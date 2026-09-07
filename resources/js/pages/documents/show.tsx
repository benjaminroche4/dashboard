import { Head, Link } from '@inertiajs/react';
import { Download, ExternalLink, Pencil, UserRound } from 'lucide-react';
import { useState } from 'react';
import { CreatedBy } from '@/components/created-by';
import { DocumentRequestRowActions } from '@/components/documents/document-request-row-actions';
import { HouseholdPersonPanel } from '@/components/documents/household-person-panel';
import { Panel } from '@/components/panel';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { downloadDocumentRequestPdf } from '@/lib/download-document-request-pdf';
import { show as leadShow } from '@/routes/leads';
import { index as toolsIndex } from '@/routes/tools';
import {
    index as documentsIndex,
    edit as documentsEdit,
} from '@/routes/tools/documents';
import type { DocumentRequestDetail } from '@/types';

type Props = {
    request: DocumentRequestDetail;
    /** DocRaptor configuré : le PDF peut être généré. */
    pdfAvailable: boolean;
};

export default function DocumentsShow({ request, pdfAvailable }: Props) {
    const [downloading, setDownloading] = useState(false);

    const download = async () => {
        setDownloading(true);
        await downloadDocumentRequestPdf(request.uuid, request.name);
        setDownloading(false);
    };

    return (
        <>
            <Head title={`Documents · ${request.name}`} />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10">
                <div className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-6">
                    <div>
                        <h1 className="text-lg font-medium">
                            Liste de documents · {request.name}
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            {request.language_label} · {request.person_count}{' '}
                            personne(s) · {request.document_count} pièce(s) ·{' '}
                            <CreatedBy
                                name={request.creator}
                                avatar={request.creator_avatar}
                                date={request.created_at}
                            />
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link
                                href={documentsEdit({
                                    documentRequest: request.uuid,
                                })}
                            >
                                <Pencil />
                                Modifier
                            </Link>
                        </Button>
                        <Button
                            onClick={download}
                            disabled={!pdfAvailable || downloading}
                            title={
                                pdfAvailable
                                    ? undefined
                                    : 'DocRaptor n’est pas configuré.'
                            }
                        >
                            {downloading ? <Spinner /> : <Download />}
                            Télécharger le PDF
                        </Button>
                        <DocumentRequestRowActions request={request} hideView />
                    </div>
                </div>

                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                    {/* content-start : une carte repliée ne s'étire pas à la hauteur de la colonne. */}
                    <div className="grid content-start gap-6">
                        {request.persons.map((person, index) => (
                            <HouseholdPersonPanel
                                key={index}
                                person={person}
                                index={index}
                            />
                        ))}
                    </div>

                    <div className="grid h-fit gap-6">
                        <Panel title="Client">
                            <dl className="bg-background grid gap-3 rounded-lg border p-3 text-sm">
                                <div>
                                    <dt className="text-muted-foreground text-xs">
                                        Nom
                                    </dt>
                                    <dd>{request.name}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground text-xs">
                                        Langue du PDF
                                    </dt>
                                    <dd>{request.language_label}</dd>
                                </div>
                            </dl>
                        </Panel>

                        {request.lead && (
                            <Panel title="Lead">
                                <Link
                                    href={leadShow({ lead: request.lead.uuid })}
                                    className="bg-background flex items-center gap-2 rounded-lg border p-3 text-sm font-medium underline-offset-4 hover:underline"
                                >
                                    <UserRound
                                        className="text-muted-foreground size-4 shrink-0"
                                        aria-hidden
                                    />
                                    {request.lead.name}
                                    {request.lead.reference && (
                                        <span className="text-muted-foreground font-normal">
                                            · {request.lead.reference}
                                        </span>
                                    )}
                                </Link>
                            </Panel>
                        )}

                        <Panel title="Lien de dépôt">
                            <a
                                href={request.upload_url}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-background flex items-start gap-2 rounded-lg border p-3 text-sm break-all hover:underline"
                            >
                                <ExternalLink className="mt-0.5 size-4 shrink-0" />
                                {request.upload_url}
                            </a>
                        </Panel>

                        {request.message && (
                            <Panel title="Message au client">
                                <p className="bg-background rounded-lg border p-3 text-sm whitespace-pre-line">
                                    {request.message}
                                </p>
                            </Panel>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

DocumentsShow.layout = {
    breadcrumbs: [
        { title: 'Outils', href: toolsIndex() },
        { title: 'Documents', href: documentsIndex() },
        { title: 'Détail', href: '#' },
    ],
};
