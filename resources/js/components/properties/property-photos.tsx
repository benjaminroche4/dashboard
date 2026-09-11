import { ImageUp, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { UploadIllustration } from '@/components/upload-illustration';
import { Button } from '@/components/ui/button';
import { Dropzone, DropzoneEmptyState } from '@/components/ui/dropzone';
import { formatFileSize } from '@/lib/format';
import { notify } from '@/lib/toast';

export const MAX_PHOTOS = 10;
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPT = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
};

/**
 * Aperçu local des fichiers choisis : une URL par fichier, révoquée dès qu'il
 * quitte la liste. Sans `createObjectURL` (jsdom), la vignette est remplacée
 * par le nom du fichier.
 */
function usePhotoPreviews(files: File[]): (string | null)[] {
    const urls = useRef(new Map<File, string>());
    const supported = typeof URL.createObjectURL === 'function';

    if (supported) {
        for (const file of files) {
            if (!urls.current.has(file)) {
                urls.current.set(file, URL.createObjectURL(file));
            }
        }
    }

    useEffect(() => {
        for (const [file, url] of urls.current) {
            if (!files.includes(file)) {
                URL.revokeObjectURL(url);
                urls.current.delete(file);
            }
        }
    }, [files]);

    // Au démontage, plus rien à afficher : on rend la mémoire au navigateur.
    useEffect(() => {
        const cache = urls.current;

        return () => {
            for (const url of cache.values()) {
                URL.revokeObjectURL(url);
            }

            cache.clear();
        };
    }, []);

    return files.map((file) => urls.current.get(file) ?? null);
}

/** Une photo déjà enregistrée : son URL affichée, son chemin renvoyé au serveur. */
export type SavedPhoto = { path: string; url: string };

/**
 * Photos d'un bien : celles déjà enregistrées (retirables) et celles à
 * envoyer. Zone de dépôt au style de la maquette Figma « D&D Content type ».
 */
export function PropertyPhotos({
    saved,
    files,
    onSavedChange,
    onFilesChange,
    disabled = false,
}: {
    saved: SavedPhoto[];
    files: File[];
    onSavedChange: (saved: SavedPhoto[]) => void;
    onFilesChange: (files: File[]) => void;
    disabled?: boolean;
}) {
    const room = MAX_PHOTOS - saved.length - files.length;
    const previews = usePhotoPreviews(files);

    const add = (added: File[]) => {
        if (room <= 0) {
            notify.warning(
                'Dix photos au maximum',
                'Retirez-en une avant d’en ajouter une autre.',
            );

            return;
        }

        onFilesChange([...files, ...added.slice(0, room)]);
    };

    return (
        <div className="grid gap-3">
            {(saved.length > 0 || files.length > 0) && (
                <ul role="list" className="flex flex-wrap gap-2">
                    {saved.map((photo) => (
                        <li key={photo.path} className="relative">
                            <img
                                src={photo.url}
                                alt=""
                                className="size-20 rounded-md border object-cover"
                            />
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                aria-label="Retirer cette photo"
                                className="absolute -top-1.5 -right-1.5 size-6 rounded-full p-0 shadow"
                                onClick={() =>
                                    onSavedChange(
                                        saved.filter(
                                            (kept) => kept.path !== photo.path,
                                        ),
                                    )
                                }
                            >
                                <X className="size-3.5" />
                            </Button>
                        </li>
                    ))}
                    {files.map((file, index) => (
                        <li key={`${file.name}-${index}`} className="relative">
                            {previews[index] === null ? (
                                <span className="bg-muted/40 grid size-20 place-content-center gap-1 rounded-md border p-1 text-center">
                                    <span className="text-muted-foreground truncate text-[0.625rem]">
                                        {file.name}
                                    </span>
                                    <span className="text-muted-foreground text-[0.625rem] tabular-nums">
                                        {formatFileSize(file.size)}
                                    </span>
                                </span>
                            ) : (
                                <img
                                    src={previews[index]}
                                    alt={`Photo à envoyer : ${file.name}`}
                                    title={`${file.name} · ${formatFileSize(file.size)}`}
                                    className="size-20 rounded-md border object-cover"
                                />
                            )}
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                aria-label={`Retirer ${file.name}`}
                                className="absolute -top-1.5 -right-1.5 size-6 rounded-full p-0 shadow"
                                onClick={() =>
                                    onFilesChange(
                                        files.filter((_, i) => i !== index),
                                    )
                                }
                            >
                                <X className="size-3.5" />
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
            <Dropzone
                accept={ACCEPT}
                maxFiles={MAX_PHOTOS}
                maxSize={MAX_SIZE}
                multiple
                disabled={disabled || room <= 0}
                aria-label="Ajouter des photos du bien"
                className="bg-muted/40 hover:bg-muted/60 gap-4 rounded-xl border-dashed px-5 py-6"
                onDrop={add}
                onError={(error) =>
                    notify.error('Photo refusée', error.message)
                }
            >
                <DropzoneEmptyState>
                    <div className="flex flex-col items-center gap-4 text-center">
                        <UploadIllustration labels={['JPG', 'PNG']} />
                        <div className="grid gap-1.5">
                            <p className="text-base font-medium">
                                Choisissez un fichier ou déposez-le ici.
                            </p>
                            <p className="text-muted-foreground text-xs">
                                JPG, PNG ou WebP · 5 Mo par photo · 10 photos au
                                maximum
                            </p>
                        </div>
                        {/* Bouton décoratif : toute la zone est déjà cliquable. */}
                        <span className="bg-background flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium shadow-[inset_0_2px_2px_0_rgba(255,255,255,0.25)]">
                            <ImageUp className="size-3.5" aria-hidden />
                            Parcourir
                        </span>
                    </div>
                </DropzoneEmptyState>
            </Dropzone>
        </div>
    );
}
