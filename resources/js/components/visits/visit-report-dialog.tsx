import { router } from '@inertiajs/react';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import { UploadIllustration } from '@/components/upload-illustration';
import { PhotoGallery } from '@/components/photo-gallery';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { Dropzone, DropzoneEmptyState } from '@/components/ui/dropzone';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { formatFileSize } from '@/lib/format';
import { notify } from '@/lib/toast';
import { report as visitReport } from '@/routes/clients/visits';
import type { Visit } from '@/types';

const MIN_LENGTH = 10;
const MAX_PHOTOS = 10;
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPT = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
};

/**
 * Compte rendu post-visite : un texte libre et les photos prises sur place,
 * recopiés dans le dossier du client à l'enregistrement. Une visite planifiée
 * passe alors en « Effectuée ».
 */
export function VisitReportDialog({
    visit,
    open,
    onOpenChange,
}: {
    visit: Visit;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [report, setReport] = useState(visit.report ?? '');
    const [photos, setPhotos] = useState<File[]>([]);
    const [error, setError] = useState<string | undefined>();
    const [busy, setBusy] = useState(false);

    // Chaque ouverture repart du compte rendu existant.
    useEffect(() => {
        if (open) {
            setReport(visit.report ?? '');
            setPhotos([]);
            setError(undefined);
        }
    }, [open, visit.report]);

    const room = MAX_PHOTOS - visit.report_photos.length - photos.length;

    const addPhotos = (files: File[]) => {
        if (room <= 0) {
            notify.warning(
                'Dix photos au maximum',
                'Enregistrez ce compte rendu avant d’en ajouter d’autres.',
            );

            return;
        }

        setPhotos((current) => [...current, ...files.slice(0, room)]);
    };

    const submit = () => {
        if (report.trim().length < MIN_LENGTH) {
            setError(
                `Décrivez la visite en au moins ${MIN_LENGTH} caractères.`,
            );

            return;
        }

        setBusy(true);
        router.post(
            visitReport({ visit: visit.uuid }).url,
            { report: report.trim(), photos },
            {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => onOpenChange(false),
                onError: (errors) =>
                    setError(errors.report ?? errors['photos.0']),
                onFinish: () => setBusy(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogTitle>
                    Compte rendu de la visite de {visit.client.name}
                </DialogTitle>
                <DialogDescription>
                    {visit.property.label} · vos impressions seront recopiées
                    dans le dossier du client.
                </DialogDescription>
                <div className="grid gap-1.5">
                    <Label htmlFor={`visit-report-${visit.uuid}`}>
                        Compte rendu
                    </Label>
                    <Textarea
                        id={`visit-report-${visit.uuid}`}
                        rows={6}
                        maxLength={5000}
                        autoFocus
                        placeholder="Réaction du client, points forts et réserves sur le bien, suite à donner…"
                        className="bg-background"
                        value={report}
                        aria-invalid={Boolean(error)}
                        onChange={(event) => setReport(event.target.value)}
                    />
                    <InputError message={error} />
                </div>

                <div className="grid gap-2">
                    <Label>
                        Photos de la visite{' '}
                        <span className="text-muted-foreground font-normal">
                            (facultatif)
                        </span>
                    </Label>

                    {visit.report_photos.length > 0 && (
                        <PhotoGallery
                            photos={visit.report_photos}
                            label={`la visite de ${visit.client.name}`}
                            className="flex flex-wrap gap-2"
                            thumbClassName="size-16"
                        />
                    )}

                    <Dropzone
                        accept={ACCEPT}
                        maxFiles={MAX_PHOTOS}
                        maxSize={MAX_SIZE}
                        multiple
                        disabled={busy || room <= 0}
                        aria-label="Ajouter des photos de la visite"
                        className="bg-background p-4"
                        onDrop={addPhotos}
                        onError={(dropError) =>
                            notify.error('Photo refusée', dropError.message)
                        }
                    >
                        <DropzoneEmptyState>
                            <div className="flex flex-col items-center justify-center gap-1 text-center">
                                <UploadIllustration />
                                <p className="text-sm font-medium text-wrap">
                                    Glissez vos photos ici, ou cliquez pour les
                                    choisir
                                </p>
                                <p className="text-muted-foreground text-xs text-wrap">
                                    JPG, PNG ou WebP · 5 Mo par photo · 10
                                    photos au maximum
                                </p>
                            </div>
                        </DropzoneEmptyState>
                    </Dropzone>

                    {photos.length > 0 && (
                        <ul role="list" className="grid gap-1">
                            {photos.map((photo, index) => (
                                <li
                                    key={`${photo.name}-${index}`}
                                    className="bg-background flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-sm"
                                >
                                    <span className="truncate">
                                        {photo.name}
                                        <span className="text-muted-foreground">
                                            {' '}
                                            · {formatFileSize(photo.size)}
                                        </span>
                                    </span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="size-7 p-0"
                                        aria-label={`Retirer ${photo.name}`}
                                        onClick={() =>
                                            setPhotos((current) =>
                                                current.filter(
                                                    (_, i) => i !== index,
                                                ),
                                            )
                                        }
                                    >
                                        <X />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <DialogClose asChild>
                        <Button variant="secondary">Annuler</Button>
                    </DialogClose>
                    <Button disabled={busy} onClick={submit}>
                        {busy && <Spinner />}
                        {visit.report
                            ? 'Mettre à jour le compte rendu'
                            : 'Enregistrer le compte rendu'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
