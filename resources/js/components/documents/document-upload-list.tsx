import { router } from '@inertiajs/react';
import {
    Check,
    Download,
    Eye,
    FileText,
    RotateCcw,
    Sparkles,
    Trash2,
    UserRoundPen,
    X,
} from 'lucide-react';
import { useState } from 'react';
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
    analyze as uploadAnalyze,
    destroy as uploadDestroy,
    preview as uploadPreview,
    profile as uploadProfile,
    review as uploadReview,
} from '@/routes/tools/documents/uploads';
import { AiBadge } from '@/components/ai-badge';
import { usePage } from '@inertiajs/react';
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
    const assistantEnabled = usePage().props.features?.assistant ?? false;

    /** Envoi d'une action sur une pièce (lecture IA, report sur la fiche). */
    const post = (url: string) => {
        setBusy(true);
        router.post(
            url,
            {},
            { preserveScroll: true, onFinish: () => setBusy(false) },
        );
    };

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
            <ul role="list" aria-label="Fichiers reçus" className="grid gap-2">
                {uploads.map((upload) => (
                    <li
                        key={upload.uuid}
                        className={cn(
                            'grid min-w-0 gap-2 rounded-lg border p-2.5 text-sm transition-colors',
                            uploadStatusTones[upload.status],
                        )}
                    >
                        {/* Ligne 1 : le fichier — son nom ouvre l'aperçu,
                            on relit avant de trancher — et la décision. */}
                        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                            <div className="flex min-w-0 items-start gap-2">
                                <FileText
                                    aria-hidden
                                    className="text-muted-foreground mt-0.5 size-4 shrink-0"
                                />
                                <div className="grid min-w-0 gap-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setPreviewing(upload)}
                                        className="truncate text-left font-medium underline-offset-4 hover:underline"
                                    >
                                        {upload.name}
                                    </button>
                                    <span className="text-muted-foreground text-xs tabular-nums">
                                        {formatFileSize(upload.size)}
                                        {upload.uploaded_at &&
                                            ` · ${dateTime.format(new Date(upload.uploaded_at))}`}
                                    </span>
                                </div>
                            </div>
                            {upload.status !== 'pending' && (
                                <p
                                    className={cn(
                                        'text-xs font-medium',
                                        uploadStatusText[upload.status],
                                    )}
                                >
                                    {upload.status_label}
                                    {upload.reviewer && ` · ${upload.reviewer}`}
                                    {upload.review_note &&
                                        ` — ${upload.review_note}`}
                                </p>
                            )}
                        </div>

                        {/* Ligne 2 : les décisions en toutes lettres — c'est le
                            travail — puis les gestes secondaires en icônes. */}
                        <div className="flex flex-wrap items-center gap-1">
                            {canReview && upload.status === 'pending' && (
                                <>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 text-xs"
                                        aria-label={`Valider ${upload.name}`}
                                        disabled={busy}
                                        onClick={() =>
                                            decide(upload, 'accepted')
                                        }
                                    >
                                        <Check
                                            aria-hidden
                                            className="text-green-700 dark:text-green-300"
                                        />
                                        Valider
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 text-xs"
                                        aria-label={`Refuser ${upload.name}`}
                                        disabled={busy}
                                        onClick={() => {
                                            setNote(upload.review_note ?? '');
                                            setRefusing(upload);
                                        }}
                                    >
                                        <X
                                            aria-hidden
                                            className="text-red-700 dark:text-red-300"
                                        />
                                        Refuser
                                    </Button>
                                </>
                            )}
                            {canReview && upload.status !== 'pending' && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-xs"
                                    aria-label={`Remettre ${upload.name} en vérification`}
                                    disabled={busy}
                                    onClick={() => decide(upload, 'pending')}
                                >
                                    <RotateCcw aria-hidden />
                                    Remettre en vérification
                                </Button>
                            )}
                            <span
                                aria-hidden
                                className="bg-border mx-1 hidden h-4 w-px sm:block"
                            />
                            {canReview && assistantEnabled && (
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="size-7"
                                    aria-label={`Relire ${upload.name} avec l’assistant`}
                                    title="Relire avec l’assistant"
                                    disabled={busy}
                                    onClick={() =>
                                        post(
                                            uploadAnalyze({
                                                documentRequest: requestUuid,
                                                upload: upload.uuid,
                                            }).url,
                                        )
                                    }
                                >
                                    <Sparkles aria-hidden />
                                </Button>
                            )}
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                aria-label={`Aperçu de ${upload.name}`}
                                title="Aperçu"
                                onClick={() => setPreviewing(upload)}
                            >
                                <Eye aria-hidden />
                            </Button>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                aria-label={`Télécharger ${upload.name}`}
                                title="Télécharger"
                                asChild
                            >
                                <a href={upload.download_url}>
                                    <Download aria-hidden />
                                </a>
                            </Button>
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="text-muted-foreground hover:text-destructive size-7"
                                aria-label={`Supprimer ${upload.name}`}
                                title="Supprimer"
                                onClick={() => setDeleting(upload)}
                            >
                                <Trash2 aria-hidden />
                            </Button>
                        </div>
                        {/* Ce que l'assistant a lu : une proposition, que le
                            membre applique d'un clic ou ignore. Sur une pièce
                            déjà tranchée, la lecture reste visible — sans
                            quoi « Relire » semblait ne rien faire — mais la
                            décision ne se propose plus. */}
                        {upload.ai_review && (
                            <div
                                role="note"
                                aria-label={`Proposition de l’assistant pour ${upload.name}`}
                                className="grid gap-1.5 rounded-md border border-violet-200 bg-violet-50/60 p-2 text-xs dark:border-violet-900 dark:bg-violet-950/40"
                            >
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <AiBadge />
                                    <span
                                        className={cn(
                                            'font-medium',
                                            upload.ai_review.verdict ===
                                                'accepted'
                                                ? 'text-green-800 dark:text-green-300'
                                                : 'text-red-800 dark:text-red-300',
                                        )}
                                    >
                                        {upload.ai_review.verdict === 'accepted'
                                            ? 'Recevable'
                                            : 'À redéposer'}
                                    </span>
                                    <span className="text-muted-foreground">
                                        · {upload.ai_review.document_type}
                                    </span>
                                </div>
                                <p>{upload.ai_review.reason}</p>
                                {(upload.ai_review.holder_name ||
                                    upload.ai_review.expires_at) && (
                                    <p className="text-muted-foreground">
                                        {[
                                            upload.ai_review.holder_name &&
                                                `Au nom de ${upload.ai_review.holder_name}`,
                                            upload.ai_review.expires_at &&
                                                `expire le ${upload.ai_review.expires_at}`,
                                        ]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </p>
                                )}
                                {canReview && upload.status === 'pending' && (
                                    <div className="flex flex-wrap gap-1 pt-0.5">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={
                                                upload.ai_review.verdict ===
                                                'accepted'
                                                    ? 'default'
                                                    : 'destructive'
                                            }
                                            className="h-7 px-2 text-xs"
                                            disabled={busy}
                                            onClick={() =>
                                                upload.ai_review &&
                                                decide(
                                                    upload,
                                                    upload.ai_review.verdict,
                                                    upload.ai_review.verdict ===
                                                        'refused'
                                                        ? upload.ai_review
                                                              .reason
                                                        : '',
                                                )
                                            }
                                        >
                                            {upload.ai_review.verdict ===
                                            'accepted'
                                                ? 'Valider comme proposé'
                                                : 'Refuser avec ce motif'}
                                        </Button>
                                        {upload.can_apply_profile && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="h-7 px-2 text-xs"
                                                disabled={busy}
                                                onClick={() =>
                                                    post(
                                                        uploadProfile({
                                                            documentRequest:
                                                                requestUuid,
                                                            upload: upload.uuid,
                                                        }).url,
                                                    )
                                                }
                                            >
                                                <UserRoundPen aria-hidden />
                                                Reporter sur la fiche
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
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
