import { Head, router, usePage } from '@inertiajs/react';
import {
    Download,
    ExternalLink,
    FileStack,
    FolderArchive,
    Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { CountryFlag } from '@/components/country-flag';
import { CreatedBy } from '@/components/created-by';
import { DocumentRequestRowActions } from '@/components/documents/document-request-row-actions';
import { HouseholdPersonTabs } from '@/components/documents/household-person-tabs';
import { DetailSection } from '@/components/real-estate/detail-header';
import { DocumentRequestLeadLink } from '@/components/documents/document-request-lead-link';
import { PresentationLetterCard } from '@/components/documents/presentation-letter-card';
import { PublicUploadLink } from '@/components/documents/public-upload-link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { downloadDocumentRequestPdf } from '@/lib/download-document-request-pdf';
import { mergeDossierPdf } from '@/lib/merge-dossier-pdf';
import { languageFlag } from '@/lib/language-flag';
import { index as toolsIndex } from '@/routes/tools';
import {
    analyze as analyzeRequest,
    archive as archiveRequest,
} from '@/routes/tools/documents';
import { index as documentsIndex } from '@/routes/tools/documents';
import type { DocumentRequestDetail } from '@/types';

type Props = {
    request: DocumentRequestDetail;
    /** DocRaptor configuré : le PDF peut être généré. */
    pdfAvailable: boolean;
};

export default function DocumentsShow({ request, pdfAvailable }: Props) {
    const [downloading, setDownloading] = useState(false);
    const [merging, setMerging] = useState(false);
    const { features } = usePage().props;
    // Seules les pièces validées par l'équipe sortent du backoffice.
    const validated = request.valid_uploads_count ?? 0;

    const merge = async () => {
        setMerging(true);
        try {
            await mergeDossierPdf(request, { withCover: pdfAvailable });
        } finally {
            setMerging(false);
        }
    };

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
                        {request.can_update && features?.assistant && (
                            /* Le bouton dit combien de pièces il relira — celles
                               à vérifier, jamais lues — et se désactive quand il
                               n'y en a pas : un clic sans effet visible passait
                               pour une panne. Une pièce déjà tranchée se relit
                               depuis sa carte. */
                            <Button
                                variant="outline"
                                disabled={(request.pending_ai_count ?? 0) === 0}
                                title={
                                    (request.pending_ai_count ?? 0) === 0
                                        ? 'Aucune pièce à relire : toutes sont déjà vérifiées ou déjà lues. Une pièce se relit depuis sa carte.'
                                        : undefined
                                }
                                onClick={() =>
                                    router.post(
                                        analyzeRequest({
                                            documentRequest: request.uuid,
                                        }).url,
                                        {},
                                        { preserveScroll: true },
                                    )
                                }
                            >
                                <Sparkles />
                                Relire les pièces avec l’IA
                                {(request.pending_ai_count ?? 0) > 0 && (
                                    <Badge
                                        variant="secondary"
                                        className="font-medium tabular-nums"
                                    >
                                        {request.pending_ai_count}
                                    </Badge>
                                )}
                            </Button>
                        )}
                        {/* Le dossier ne part qu'avec des pièces validées :
                            le menu le dit dans son intitulé et se grise
                            tant qu'il n'y en a aucune. */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    disabled={validated === 0 || merging}
                                    title={
                                        validated === 0
                                            ? 'Aucune pièce validée : le dossier ne part qu’avec des pièces vérifiées par l’équipe.'
                                            : undefined
                                    }
                                >
                                    {merging ? <Spinner /> : <FileStack />}
                                    Pièces validées
                                    <Badge
                                        variant="secondary"
                                        className="font-medium tabular-nums"
                                    >
                                        {validated}
                                    </Badge>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => void merge()}>
                                    <FileStack aria-hidden />
                                    Dossier fusionné (PDF)
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <a
                                        href={
                                            archiveRequest({
                                                documentRequest: request.uuid,
                                            }).url
                                        }
                                    >
                                        <FolderArchive aria-hidden />
                                        Toutes les pièces (.zip)
                                    </a>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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
                    {/* Deux colonnes, comme sur les autres fiches : les pièces
                        du foyer à gauche (un onglet par personne), la colonne
                        de 320 px à droite pour le client, le lead et le dépôt. */}
                    <div className="grid gap-6">
                        <HouseholdPersonTabs
                            persons={request.persons}
                            requestUuid={request.uuid}
                            canReview={request.can_update}
                        />

                        {request.can_update && (
                            <DetailSection title="Lettre de présentation">
                                <PresentationLetterCard
                                    requestUuid={request.uuid}
                                    letter={request.presentation_letter}
                                />
                            </DetailSection>
                        )}
                    </div>

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
                                {request.message && (
                                    <div>
                                        <dt className="text-muted-foreground text-xs">
                                            Message au client
                                        </dt>
                                        <dd className="whitespace-pre-line">
                                            {request.message}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </DetailSection>

                        <DetailSection title="Lead ou dossier client">
                            <DocumentRequestLeadLink
                                requestUuid={request.uuid}
                                lead={request.lead}
                                canEdit={request.can_update}
                            />
                        </DetailSection>

                        <DetailSection title="Lien de dépôt">
                            <PublicUploadLink
                                requestUuid={request.uuid}
                                url={request.public_url}
                                accessCode={request.access_code}
                                uploadsCount={request.uploads_count}
                                leadEmails={request.lead_emails}
                                linkSentTo={request.link_sent_to}
                                linkSentAt={request.link_sent_at}
                            />
                            {request.upload_url && (
                                <a
                                    href={request.upload_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-muted-foreground flex items-start gap-2 text-sm break-all hover:underline"
                                >
                                    <ExternalLink className="mt-0.5 size-4 shrink-0" />
                                    Dossier Google Drive
                                </a>
                            )}
                        </DetailSection>
                    </div>
                </div>
            </div>
        </>
    );
}

DocumentsShow.layout = {
    breadcrumbs: [
        { title: 'Outils', href: toolsIndex() },
        { title: 'Listes de pièces', href: documentsIndex() },
        { title: 'Détail', href: '#' },
    ],
};
