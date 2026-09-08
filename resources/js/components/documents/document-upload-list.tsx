import { router } from '@inertiajs/react';
import { Download, FileText, Trash2 } from 'lucide-react';
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
import { destroy as uploadDestroy } from '@/routes/tools/documents/uploads';
import type { DocumentUpload } from '@/types';

const dateTime = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
});

/**
 * Fichiers déposés par le client pour une pièce : téléchargement et
 * suppression (avec confirmation), sur la page d'une liste de documents.
 */
export function DocumentUploadList({
    requestUuid,
    uploads,
}: {
    requestUuid: string;
    uploads: DocumentUpload[];
}) {
    const [deleting, setDeleting] = useState<DocumentUpload | null>(null);
    const [busy, setBusy] = useState(false);

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
                    <li key={upload.uuid} className="flex min-w-0">
                        <Attachment size="sm" className="bg-background">
                            <AttachmentMedia>
                                <FileText aria-hidden />
                            </AttachmentMedia>
                            <AttachmentContent>
                                <AttachmentTitle>
                                    <a
                                        href={upload.download_url}
                                        className="underline-offset-4 hover:underline"
                                    >
                                        {upload.name}
                                    </a>
                                </AttachmentTitle>
                                <AttachmentDescription>
                                    {formatFileSize(upload.size)}
                                    {upload.uploaded_at &&
                                        ` · ${dateTime.format(new Date(upload.uploaded_at))}`}
                                </AttachmentDescription>
                            </AttachmentContent>
                            <AttachmentActions>
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
                    </li>
                ))}
            </ul>

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
