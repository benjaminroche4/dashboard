import { router } from '@inertiajs/react';
import { Camera, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/toast';

export const PICTURE_ACCEPT = 'image/jpeg,image/png,image/webp';
export const PICTURE_MAX_BYTES = 2 * 1024 * 1024;

/** Deux lettres au plus, pour la pastille sans image. */
export function pictureInitials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() ?? '')
        .join('');
}

/** Les mots de la pastille : « logo » pour une entreprise, « photo » pour une personne. */
export type PictureLabels = {
    /** « Ajouter un logo » / « Ajouter une photo ». */
    add: string;
    /** « Changer le logo » / « Changer la photo ». */
    change: string;
    /** « Retirer le logo » / « Retirer la photo ». */
    remove: string;
    /** « Choisir un logo » / « Choisir une photo » (champ fichier). */
    choose: string;
    /** Toast quand le fichier dépasse 2 Mo. */
    tooLarge: string;
};

type Props = {
    /** Nom dont on tire les initiales sans image. */
    name: string;
    /** URL de l'image, null sans image. */
    src: string | null;
    /** Route POST (multipart) qui reçoit le fichier. */
    uploadUrl: string;
    /** Nom du champ de fichier (`logo`, `photo`). */
    field: string;
    labels: PictureLabels;
    /** Une photo de personne remplit la pastille ; un logo garde une marge. */
    fit?: 'contain' | 'cover';
    /** Teinte de la pastille sans image. */
    className?: string;
};

/**
 * La pastille de l'en-tête d'une fiche, cliquable : l'image (ou les initiales
 * sans image) avec, au survol et au focus, un voile et un appareil photo qui
 * disent qu'on peut en poser une. Le fichier choisi part aussitôt en
 * multipart ; une taille excessive est refusée localement, en toast, pour
 * éviter un envoi inutile. Sert au logo d'une entreprise et à la photo d'un
 * agent (28 octobre 2026).
 */
export function PictureTile({
    name,
    src,
    uploadUrl,
    field,
    labels,
    fit = 'contain',
    className,
}: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [processing, setProcessing] = useState(false);
    const label = src ? labels.change : labels.add;

    const upload = (file: File) => {
        if (file.size > PICTURE_MAX_BYTES) {
            notify.error(labels.tooLarge);

            return;
        }

        router.post(
            uploadUrl,
            { [field]: file },
            {
                forceFormData: true,
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => {
                    setProcessing(false);
                    if (inputRef.current) {
                        inputRef.current.value = '';
                    }
                },
            },
        );
    };

    return (
        <>
            <input
                ref={inputRef}
                type="file"
                name={field}
                accept={PICTURE_ACCEPT}
                className="sr-only"
                aria-label={labels.choose}
                tabIndex={-1}
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                        upload(file);
                    }
                }}
            />
            <button
                type="button"
                aria-label={label}
                title={`${label} · JPG, PNG ou WebP, 2 Mo maximum`}
                disabled={processing}
                onClick={() => inputRef.current?.click()}
                className={cn(
                    'group focus-visible:ring-ring relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg text-sm font-semibold outline-none focus-visible:ring-2',
                    src
                        ? 'bg-background border'
                        : (className ?? 'bg-muted text-muted-foreground'),
                )}
            >
                {src ? (
                    <img
                        src={src}
                        alt=""
                        className={cn(
                            'size-full',
                            fit === 'cover'
                                ? 'object-cover'
                                : 'object-contain p-0.5',
                        )}
                    />
                ) : (
                    <span aria-hidden>{pictureInitials(name)}</span>
                )}
                {/* Le voile ne répond qu'au survol et au focus : il dit le geste, il n'anime rien. */}
                <span
                    aria-hidden
                    className={cn(
                        'absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none',
                        processing && 'opacity-100',
                    )}
                >
                    {processing ? (
                        <Spinner className="size-4" />
                    ) : (
                        <Camera className="size-4" />
                    )}
                </span>
            </button>
        </>
    );
}

/** Entrée « Retirer … » du menu « ⋯ » de la fiche ; absente sans image. */
export function PictureMenuItem({
    src,
    removeUrl,
    label,
}: {
    src: string | null;
    removeUrl: string;
    label: string;
}) {
    if (!src) {
        return null;
    }

    return (
        <DropdownMenuItem
            onSelect={() => router.delete(removeUrl, { preserveScroll: true })}
        >
            <Trash2 />
            {label}
        </DropdownMenuItem>
    );
}
