import { Head, Link } from '@inertiajs/react';
import { Download, ExternalLink, Pencil } from 'lucide-react';
import { useState } from 'react';
import { CountryFlag } from '@/components/country-flag';
import { CreatedBy } from '@/components/created-by';
import { DocumentRequestRowActions } from '@/components/documents/document-request-row-actions';
import { HouseholdPersonTabs } from '@/components/documents/household-person-tabs';
import { DetailSection } from '@/components/real-estate/detail-header';
import { DocumentRequestLeadLink } from '@/components/documents/document-request-lead-link';
import { PublicUploadLink } from '@/components/documents/public-upload-link';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { downloadDocumentRequestPdf } from '@/lib/download-document-request-pdf';
import { languageFlag } from '@/lib/language-flag';
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
                            Liste de pièces · {request.name}
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

                <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                    {/* Un onglet par personne du foyer (quatre au plus) :
                        ses pièces prennent toute la largeur. */}
                    <HouseholdPersonTabs
                        persons={request.persons}
                        requestUuid={request.uuid}
                    />

                    <div className="grid h-fit gap-6">
                        <DetailSection title="Client">
                            <dl className="grid gap-3 text-sm">
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
                                    <dd className="flex items-center gap-2">
                                        <CountryFlag
                                            code={languageFlag(
                                                request.language,
                                            )}
                                        />
                                        {request.language_label}
                                    </dd>
                                </div>
                            </dl>
                        </DetailSection>

                        <DetailSection title="Lead">
                            <DocumentRequestLeadLink
                                requestUuid={request.uuid}
                                lead={request.lead}
                                canEdit={request.can_update}
                            />
                        </DetailSection>

                        <DetailSection title="Lien de dépôt">
                            <p className="text-muted-foreground text-sm">
                                À transmettre au client avec le code d’appairage
                                : il y dépose ses pièces sans compte.
                            </p>
                            <PublicUploadLink
                                requestUuid={request.uuid}
                                url={request.public_url}
                                accessCode={request.access_code}
                                uploadsCount={request.uploads_count}
                                leadEmails={request.lead_emails}
                                linkSentTo={request.link_sent_to}
                                linkSentAt={request.link_sent_at}
                            />
                        </DetailSection>

                        {request.upload_url && (
                            <DetailSection title="Dossier Google Drive">
                                <a
                                    href={request.upload_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-start gap-2 text-sm break-all hover:underline"
                                >
                                    <ExternalLink className="mt-0.5 size-4 shrink-0" />
                                    {request.upload_url}
                                </a>
                            </DetailSection>
                        )}

                        {request.message && (
                            <DetailSection title="Message au client">
                                <p className="text-sm whitespace-pre-line">
                                    {request.message}
                                </p>
                            </DetailSection>
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
