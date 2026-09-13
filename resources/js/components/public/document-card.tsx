import { Check, FileText, UploadCloud, X } from 'lucide-react';
import { useState } from 'react';
import type { FileRejection } from 'react-dropzone';
import { DocumentPreviewDialog } from '@/components/documents/document-preview-dialog';
import {
    documentReview,
    uploadStatusText,
    uploadStatusTones,
} from '@/components/documents/upload-status';
import {
    Attachment,
    AttachmentContent,
    AttachmentDescription,
    AttachmentMedia,
    AttachmentTitle,
} from '@/components/ui/attachment';
import { Dropzone, DropzoneEmptyState } from '@/components/ui/dropzone';
import { Spinner } from '@/components/ui/spinner';
import { formatFileSize } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PublicDocumentDetail, PublicDocumentUpload } from '@/types';

const ACCEPT = { 'application/pdf': ['.pdf'] };

export type DocumentCardLabels = {
    done: string;
    refused: string;
    uploaded: string;
    view: string;
    drop: string;
    sending: string;
    formats: string;
    none: string;
};

type Props = {
    document: PublicDocumentDetail;
    labels: DocumentCardLabels;
    limits: { file: number; files: number; total: number };
    /** Envoi en cours pour cette pièce. */
    busy: boolean;
    /** Rang de la pièce dans sa catégorie, pour les variantes numérotées. */
    position: number;
    onDrop: (files: File[]) => void;
    onRejected: (rejections: FileRejection[]) => void;
};

/** Intitulé de la pièce et sa précision. */
function Title({
    document,
    className,
}: {
    document: PublicDocumentDetail;
    className?: string;
}) {
    return (
        <div className={cn('min-w-0', className)}>
            <p className="text-sm font-medium">{document.label}</p>
            {document.hint && (
                <p className="text-muted-foreground text-sm">{document.hint}</p>
            )}
        </div>
    );
}

/** Fichiers déjà déposés : chacun s'ouvre dans la page, sans téléchargement. */
function Files({
    document,
    labels,
    className,
    compact = false,
}: {
    document: PublicDocumentDetail;
    labels: DocumentCardLabels;
    className?: string;
    /** Sans la décision de l'équipe sous le fichier. */
    compact?: boolean;
}) {
    const [previewing, setPreviewing] = useState<PublicDocumentUpload | null>(
        null,
    );

    if (document.uploads.length === 0) {
        return null;
    }

    return (
        <>
            <ul
                role="list"
                aria-label={`${labels.uploaded} · ${document.label}`}
                className={cn('flex flex-wrap gap-2', className)}
            >
                {document.uploads.map((upload) => (
                    <li key={upload.uuid} className="grid min-w-0 gap-1">
                        <button
                            type="button"
                            onClick={() => setPreviewing(upload)}
                            title={`${labels.view} · ${upload.name}`}
                            className="focus-visible:ring-ring flex min-w-0 rounded-md text-left focus-visible:ring-2 focus-visible:outline-none"
                        >
                            <Attachment
                                size="sm"
                                className={cn(
                                    'transition-colors',
                                    uploadStatusTones[upload.status],
                                )}
                            >
                                <AttachmentMedia>
                                    <FileText aria-hidden />
                                </AttachmentMedia>
                                <AttachmentContent>
                                    <AttachmentTitle>
                                        {upload.name}
                                    </AttachmentTitle>
                                    <AttachmentDescription>
                                        {formatFileSize(upload.size)} ·{' '}
                                        {labels.view}
                                    </AttachmentDescription>
                                </AttachmentContent>
                            </Attachment>
                        </button>
                        {!compact && (
                            <p
                                className={cn(
                                    'px-1 text-xs',
                                    uploadStatusText[upload.status],
                                )}
                            >
                                {upload.status_label}
                                {upload.review_note &&
                                    ` — ${upload.review_note}`}
                            </p>
                        )}
                    </li>
                ))}
            </ul>
            {/* Le client relit sa pièce sans la télécharger, comme l'équipe. */}
            <DocumentPreviewDialog
                file={
                    previewing && { name: previewing.name, url: previewing.url }
                }
                onOpenChange={(open) => !open && setPreviewing(null)}
            />
        </>
    );
}

/** Zone de dépôt : la même partout, seule son enveloppe change. */
function Drop({
    document,
    labels,
    limits,
    busy,
    onDrop,
    onRejected,
    className,
    slim = false,
}: Pick<
    Props,
    'document' | 'labels' | 'limits' | 'busy' | 'onDrop' | 'onRejected'
> & {
    className?: string;
    /** Une barre basse plutôt qu'un carré. */
    slim?: boolean;
}) {
    return (
        <Dropzone
            accept={ACCEPT}
            maxFiles={limits.files}
            maxSize={limits.file}
            multiple
            disabled={busy}
            aria-label={`${labels.drop} · ${document.label}`}
            onDrop={onDrop}
            onRejected={onRejected}
            className={cn('bg-background', slim ? 'p-3' : 'p-5', className)}
        >
            <DropzoneEmptyState>
                <div
                    className={cn(
                        'flex gap-1 text-center',
                        slim
                            ? 'flex-row items-center justify-center gap-2'
                            : 'flex-col items-center justify-center',
                    )}
                >
                    {busy ? (
                        <Spinner />
                    ) : (
                        <UploadCloud
                            className="text-muted-foreground size-5 shrink-0"
                            aria-hidden
                        />
                    )}
                    <p className="text-sm font-medium text-wrap">
                        {busy ? labels.sending : labels.drop}
                    </p>
                    {!slim && (
                        <p className="text-muted-foreground text-xs text-wrap">
                            {labels.formats}
                        </p>
                    )}
                </div>
            </DropzoneEmptyState>
        </Dropzone>
    );
}

/**
 * Une pièce à fournir sur la page publique de dépôt, présentée comme une
 * étape d'un parcours : un numéro relié au suivant, qui devient une coche
 * quand la pièce est reçue, puis l'intitulé, les fichiers déjà déposés et la
 * zone de dépôt.
 */
export function DocumentCard({
    document,
    labels,
    limits,
    busy,
    position,
    onDrop,
    onRejected,
}: Props) {
    // La pastille dit où en est la pièce, pas seulement qu'un fichier est
    // arrivé : une pièce refusée ne mérite pas une coche verte.
    const review = documentReview(document.uploads);

    return (
        <div className="relative grid grid-cols-[--spacing(8)_minmax(0,1fr)] gap-x-3 gap-y-3 pb-2">
            {/* Le filet relie les étapes : les pièces se lisent comme un
                parcours à dérouler, pas comme une pile de cartes. */}
            <span
                aria-hidden
                className="bg-border absolute top-9 bottom-0 left-4 w-px"
            />
            <span
                className={cn(
                    'relative z-10 flex size-8 items-center justify-center rounded-full border text-xs font-medium tabular-nums',
                    review === 'none' && 'bg-background',
                    // Déposée, pas encore relue : neutre, sans promesse.
                    review === 'pending' &&
                        'bg-muted text-muted-foreground border-transparent',
                    review === 'accepted' &&
                        'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
                    review === 'refused' &&
                        'border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300',
                )}
            >
                {/* Une icône seule ne dit rien à voix haute : l'état reste
                    écrit pour les lecteurs d'écran. */}
                {review === 'accepted' && (
                    <>
                        <Check className="size-4" aria-hidden />
                        <span className="sr-only">{labels.done}</span>
                    </>
                )}
                {review === 'refused' && (
                    <>
                        <X className="size-4" aria-hidden />
                        <span className="sr-only">{labels.refused}</span>
                    </>
                )}
                {review !== 'accepted' && review !== 'refused' && position}
            </span>
            <div className="grid gap-3">
                <Title document={document} />
                <Files document={document} labels={labels} />
                <Drop
                    document={document}
                    labels={labels}
                    limits={limits}
                    busy={busy}
                    onDrop={onDrop}
                    onRejected={onRejected}
                />
            </div>
        </div>
    );
}
