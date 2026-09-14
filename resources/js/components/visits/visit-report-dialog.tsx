import { router } from '@inertiajs/react';
import { Mail, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import { ChoicePills } from '@/components/leads/condition-choices';
import { PhotoGallery } from '@/components/photo-gallery';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { UploadIllustration } from '@/components/upload-illustration';
import { formatFileSize } from '@/lib/format';
import { propertyOutcomes } from '@/lib/property-outcomes';
import { notify } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
    initialReportForm,
    reportPayload,
    validateReportForm,
} from '@/lib/visit-report';
import { report as visitReport } from '@/routes/clients/visits';
import type { PropertyStatusOption, Visit, VisitReportForm } from '@/types';

const MAX_PHOTOS = 10;
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPT = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
};

type Errors = Partial<Record<'report' | 'photos', string>>;

/** Un bloc du compte rendu : un titre, une phrase d'aide, puis les champs. */
function Block({
    title,
    hint,
    children,
}: {
    title: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <section aria-label={title} className="grid gap-3">
            <div className="grid gap-0.5">
                <h3 className="text-sm font-medium">{title}</h3>
                {hint && (
                    <p className="text-muted-foreground text-xs">{hint}</p>
                )}
            </div>
            {children}
        </section>
    );
}

/**
 * Compte rendu post-visite : les impressions en texte libre, les photos
 * prises sur place, et la prochaine étape du bien pour ce client — qui met à
 * jour le suivi du dossier. Le compte rendu est recopié dans le dossier ;
 * une visite planifiée passe en « Effectuée ».
 */
export function VisitReportDialog({
    visit,
    statuses = propertyOutcomes,
    open,
    onOpenChange,
}: {
    visit: Visit;
    /** Étapes possibles pour le bien visité ; par défaut, le miroir de l'enum. */
    statuses?: PropertyStatusOption[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [form, setForm] = useState<VisitReportForm>(() =>
        initialReportForm(visit, visit.outcome),
    );
    const [photos, setPhotos] = useState<File[]>([]);
    const [errors, setErrors] = useState<Errors>({});
    const [busy, setBusy] = useState(false);
    /** Envoyer le compte rendu au client : décoché par défaut, l'équipe décide. */
    const [notifyClient, setNotifyClient] = useState(false);

    // Chaque ouverture repart du compte rendu existant.
    useEffect(() => {
        if (open) {
            setForm(initialReportForm(visit, visit.outcome));
            setPhotos([]);
            setErrors({});
            setNotifyClient(false);
        }
    }, [open, visit]);

    const set = <K extends keyof VisitReportForm>(
        key: K,
        value: VisitReportForm[K],
    ) => setForm((current) => ({ ...current, [key]: value }));

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
        const problems = validateReportForm(form);

        if (Object.keys(problems).length > 0) {
            setErrors(problems);

            return;
        }

        setBusy(true);
        router.post(
            visitReport({ visit: visit.uuid }).url,
            { ...reportPayload(form), photos, notify_client: notifyClient },
            {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => onOpenChange(false),
                onError: (serverErrors) =>
                    setErrors({
                        report: serverErrors.report,
                        photos: serverErrors['photos.0'],
                    }),
                onFinish: () => setBusy(false),
            },
        );
    };

    const step = statuses.find((option) => option.value === form.next_status);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogTitle>
                    Compte rendu de la visite de {visit.client.name}
                </DialogTitle>
                <DialogDescription>
                    {visit.property.label} · vos impressions seront recopiées
                    dans le dossier du client.
                </DialogDescription>

                <div className="grid gap-6">
                    <Block title="Impressions générales">
                        <div className="grid gap-1.5">
                            <Label
                                htmlFor={`visit-report-${visit.uuid}`}
                                className="sr-only"
                            >
                                Compte rendu
                            </Label>
                            <Textarea
                                id={`visit-report-${visit.uuid}`}
                                rows={4}
                                maxLength={5000}
                                placeholder="Ce que vous retenez de la visite, en quelques lignes…"
                                className="bg-background"
                                value={form.report}
                                aria-invalid={Boolean(errors.report)}
                                onChange={(event) =>
                                    set('report', event.target.value)
                                }
                            />
                            <InputError message={errors.report} />
                        </div>
                    </Block>

                    <Block
                        title="Prochaine étape"
                        hint="Ce que devient ce bien pour le client ; le suivi du dossier se met à jour."
                    >
                        <ChoicePills
                            id={`visit-next-status-${visit.uuid}`}
                            label="Prochaine étape"
                            options={statuses.map(({ value, label }) => ({
                                value,
                                label,
                            }))}
                            value={form.next_status}
                            onChange={(value) =>
                                set(
                                    'next_status',
                                    value as VisitReportForm['next_status'],
                                )
                            }
                        />
                        {step && (
                            <p className="text-muted-foreground text-xs">
                                {step.hint}
                            </p>
                        )}
                    </Block>

                    <Block title="Photos de la visite" hint="Facultatif.">
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
                                        Glissez vos photos ici, ou cliquez pour
                                        les choisir
                                    </p>
                                    <p className="text-muted-foreground text-xs text-wrap">
                                        JPG, PNG ou WebP · 5 Mo par photo · 10
                                        photos au maximum
                                    </p>
                                </div>
                            </DropzoneEmptyState>
                        </Dropzone>
                        <InputError message={errors.photos} />

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
                    </Block>
                </div>

                {/* Le client reçoit le compte rendu s'il a une adresse, et si on le demande. */}
                <label
                    htmlFor={`visit-report-notify-${visit.uuid}`}
                    className={cn(
                        'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                        visit.can_notify_client
                            ? 'cursor-pointer'
                            : 'opacity-60',
                        notifyClient
                            ? 'border-primary bg-primary/5'
                            : visit.can_notify_client && 'hover:bg-accent/60',
                    )}
                >
                    <Checkbox
                        id={`visit-report-notify-${visit.uuid}`}
                        checked={notifyClient}
                        disabled={!visit.can_notify_client || busy}
                        onCheckedChange={(state) =>
                            setNotifyClient(state === true)
                        }
                        className="mt-0.5"
                    />
                    <span className="grid gap-0.5">
                        <span className="flex items-center gap-2 text-sm font-medium">
                            <Mail className="size-4" aria-hidden />
                            Envoyer le compte rendu au client
                        </span>
                        <span className="text-muted-foreground text-xs">
                            {visit.can_notify_client
                                ? 'Envoie vos impressions et les premières photos, traduites dans la langue du client.'
                                : 'Aucune adresse e-mail sur ce dossier.'}
                        </span>
                    </span>
                </label>

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
