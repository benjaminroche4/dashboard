import { router } from '@inertiajs/react';
import {
    Check,
    Download,
    Eye,
    FileText,
    RotateCcw,
    Trash2,
    X,
} from 'lucide-react';
import { useState } from 'react';
import {
    Attachment,
    AttachmentAction,
    AttachmentActions,
    AttachmentContent,
    AttachmentDescription,
    AttachmentMedia,
    AttachmentTitle,
} from '@/components/ui/attachment';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { formatFileSize } from '@/lib/format';
import {
    destroy as uploadDestroy,
    preview as uploadPreview,
    review as uploadReview,
} from '@/routes/tools/documents/uploads';
import { DocumentPreviewDialog } from '@/components/documents/document-preview-dialog';
import {
    uploadStatusText,
    uploadStatusTones,
} from '@/components/documents/upload-status';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { DocumentUpload } from '@/types';
import { parisFormat } from '@/lib/datetime';

const dateTime = parisFormat({
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
});

/**
 * Fichiers déposés par le client pour une pièce : relecture (validée, refusée
 * avec un motif que le client lira, ou remise en vérification), téléchargement
 * et suppression. La carte prend la couleur de la décision : verte validée,
 * rouge refusée, neutre tant que rien n'est tranché.
 */
export function DocumentUploadList({
    requestUuid,
    uploads,
    canReview = false,
}: {
    requestUuid: string;
    uploads: DocumentUpload[];
    /** Le front masque, le serveur refuse : seuls ceux qui peuvent modifier la liste tranchent. */
    canReview?: boolean;
}) {
    const [deleting, setDeleting] = useState<DocumentUpload | null>(null);
    const [previewing, setPreviewing] = useState<DocumentUpload | null>(null);
    const [refusing, setRefusing] = useState<DocumentUpload | null>(null);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);

    /** Pose la décision ; le motif n'accompagne qu'un refus. */
    const decide = (
        upload: DocumentUpload,
        status: DocumentUpload['status'],
        motif = '',
    ) => {
        setBusy(true);
        router.patch(
            uploadReview({
                documentRequest: requestUuid,
                upload: upload.uuid,
            }).url,
            { status, note: motif.trim() || null },
            {
                preserveScroll: true,
                onFinish: () => {
                    setBusy(false);
                    setRefusing(null);
                    setNote('');
                },
            },
        );
    };

    if (uploads.length === 0) {
        return null;
    }

    const remove = () => {
        if (!deleting) {
            return;
        }

        setBusy(true);
        router.delete(
            uploadDestroy({
                documentRequest: requestUuid,
                upload: deleting.uuid,
            }).url,
            {
                preserveScroll: true,
                onFinish: () => {
                    setBusy(false);
                    setDeleting(null);
                },
            },
        );
    };

    return (
        <>
            <ul
                role="list"
                aria-label="Fichiers reçus"
                className="flex flex-wrap gap-2"
            >
                {uploads.map((upload) => (
                    <li key={upload.uuid} className="grid min-w-0 gap-1">
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
                                    {/* Le nom ouvre la pièce dans la page :
                                        on la relit avant de la valider. */}
                                    <button
                                        type="button"
                                        onClick={() => setPreviewing(upload)}
                                        className="truncate underline-offset-4 hover:underline"
                                    >
                                        {upload.name}
                                    </button>
                                </AttachmentTitle>
                                <AttachmentDescription>
                                    {formatFileSize(upload.size)}
                                    {upload.uploaded_at &&
                                        ` · ${dateTime.format(new Date(upload.uploaded_at))}`}
                                </AttachmentDescription>
                            </AttachmentContent>
                            <AttachmentActions>
                                {canReview &&
                                    (upload.status === 'accepted' ? (
                                        <AttachmentAction
                                            aria-label={`Remettre ${upload.name} en vérification`}
                                            disabled={busy}
                                            onClick={() =>
                                                decide(upload, 'pending')
                                            }
                                        >
                                            <RotateCcw aria-hidden />
                                        </AttachmentAction>
                                    ) : (
                                        <AttachmentAction
                                            aria-label={`Valider ${upload.name}`}
                                            disabled={busy}
                                            onClick={() =>
                                                decide(upload, 'accepted')
                                            }
                                        >
                                            <Check aria-hidden />
                                        </AttachmentAction>
                                    ))}
                                {canReview &&
                                    (upload.status === 'refused' ? (
                                        <AttachmentAction
                                            aria-label={`Remettre ${upload.name} en vérification`}
                                            disabled={busy}
                                            onClick={() =>
                                                decide(upload, 'pending')
                                            }
                                        >
                                            <RotateCcw aria-hidden />
                                        </AttachmentAction>
                                    ) : (
                                        <AttachmentAction
                                            aria-label={`Refuser ${upload.name}`}
                                            disabled={busy}
                                            onClick={() => {
                                                setNote(
                                                    upload.review_note ?? '',
                                                );
                                                setRefusing(upload);
                                            }}
                                        >
                                            <X aria-hidden />
                                        </AttachmentAction>
                                    ))}
                                <AttachmentAction
                                    aria-label={`Aperçu de ${upload.name}`}
                                    onClick={() => setPreviewing(upload)}
                                >
                                    <Eye aria-hidden />
                                </AttachmentAction>
                                <AttachmentAction
                                    aria-label={`Télécharger ${upload.name}`}
                                    asChild
                                >
                                    <a href={upload.download_url}>
                                        <Download aria-hidden />
                                    </a>
                                </AttachmentAction>
                                <AttachmentAction
                                    aria-label={`Supprimer ${upload.name}`}
                                    onClick={() => setDeleting(upload)}
                                >
                                    <Trash2 aria-hidden />
                                </AttachmentAction>
                            </AttachmentActions>
                        </Attachment>
                        {upload.status !== 'pending' && (
                            <p
                                className={cn(
                                    'px-1 text-xs',
                                    uploadStatusText[upload.status],
                                )}
                            >
                                {upload.status_label}
                                {upload.reviewer && ` · ${upload.reviewer}`}
                                {upload.review_note &&
                                    ` — ${upload.review_note}`}
                            </p>
                        )}
                    </li>
                ))}
            </ul>

            <DocumentPreviewDialog
                file={
                    previewing && {
                        name: previewing.name,
                        url: uploadPreview({
                            documentRequest: requestUuid,
                            upload: previewing.uuid,
                        }).url,
                        downloadUrl: previewing.download_url,
                    }
                }
                onOpenChange={(open) => !open && setPreviewing(null)}
            />

            <Dialog
                open={refusing !== null}
                onOpenChange={(open) => !open && setRefusing(null)}
            >
                <DialogContent>
                    <DialogTitle>Refuser {refusing?.name} ?</DialogTitle>
                    <DialogDescription>
                        Le motif est facultatif, mais le client le lit sur sa
                        page de dépôt : il sait quoi redéposer.
                    </DialogDescription>
                    <div className="grid gap-2">
                        <Label htmlFor="upload-refusal-note">
                            Motif du refus
                        </Label>
                        <Textarea
                            id="upload-refusal-note"
                            rows={3}
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                            placeholder="Document illisible, page manquante, date trop ancienne…"
                        />
                    </div>
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button variant="secondary">Annuler</Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            disabled={busy}
                            onClick={() =>
                                refusing && decide(refusing, 'refused', note)
                            }
                        >
                            Refuser la pièce
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
            >
                <DialogContent>
                    <DialogTitle>
                        Supprimer le fichier {deleting?.name} ?
                    </DialogTitle>
                    <DialogDescription>
                        Le fichier déposé par le client sera effacé
                        définitivement.
                    </DialogDescription>
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button variant="secondary">Annuler</Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            disabled={busy}
                            onClick={remove}
                        >
                            Supprimer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
