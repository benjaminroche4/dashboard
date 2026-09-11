import { ChevronLeft, ChevronRight, Expand, Star, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/** Photo suivante ou précédente, en boucle. */
export function stepPhoto(index: number, step: number, total: number): number {
    if (total === 0) {
        return 0;
    }

    return (index + step + total) % total;
}

/**
 * Diaporama d'une galerie : la photo en grand, les flèches pour circuler et
 * les touches ← → du clavier. Fermé par Échap, comme toute modale.
 */
export function PhotoLightbox({
    photos,
    label,
    index,
    onIndexChange,
    onOpenChange,
}: {
    photos: string[];
    /** Ce que montrent les photos, pour le titre et les textes alternatifs. */
    label: string;
    /** Photo affichée ; null quand le diaporama est fermé. */
    index: number | null;
    onIndexChange: (index: number) => void;
    onOpenChange: (open: boolean) => void;
}) {
    const open = index !== null;
    const current = index ?? 0;

    useEffect(() => {
        if (!open) {
            return;
        }

        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'ArrowRight') {
                onIndexChange(stepPhoto(current, 1, photos.length));
            }
            if (event.key === 'ArrowLeft') {
                onIndexChange(stepPhoto(current, -1, photos.length));
            }
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [open, current, photos.length, onIndexChange]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* Plein écran sur fond sombre : la photo occupe tout, les
                commandes flottent par-dessus. */}
            <DialogContent
                showCloseButton={false}
                className="grid h-dvh max-h-none w-screen max-w-none grid-rows-[auto_minmax(0,1fr)_auto] gap-0 rounded-none border-0 bg-neutral-950 p-0 text-white sm:max-w-none"
            >
                <DialogHeader className="flex-row items-center justify-between gap-4 px-4 py-3">
                    <div className="grid min-w-0 gap-0.5 text-left">
                        <DialogTitle className="truncate text-base font-medium">
                            {label}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-neutral-400">
                            Photo {current + 1} sur {photos.length}
                        </DialogDescription>
                    </div>
                    <DialogClose asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Fermer le diaporama"
                            className="shrink-0 rounded-full text-white hover:bg-white/15 hover:text-white"
                        >
                            <X aria-hidden />
                        </Button>
                    </DialogClose>
                </DialogHeader>

                <div className="relative flex min-h-0 items-center justify-center px-4 pb-6">
                    <img
                        src={photos[current]}
                        alt={`Photo ${current + 1} de ${label}`}
                        className="max-h-full max-w-full object-contain"
                    />
                    {photos.length > 1 && (
                        <>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Photo précédente"
                                className="absolute top-1/2 left-4 -translate-y-1/2 rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/25 hover:text-white"
                                onClick={() =>
                                    onIndexChange(
                                        stepPhoto(current, -1, photos.length),
                                    )
                                }
                            >
                                <ChevronLeft aria-hidden />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Photo suivante"
                                className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/25 hover:text-white"
                                onClick={() =>
                                    onIndexChange(
                                        stepPhoto(current, 1, photos.length),
                                    )
                                }
                            >
                                <ChevronRight aria-hidden />
                            </Button>
                        </>
                    )}
                </div>

                {photos.length > 1 && (
                    <div className="px-4 pb-4">
                        <ul
                            role="list"
                            className="flex [scrollbar-width:none] justify-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden"
                        >
                            {photos.map((photo, position) => (
                                <li key={photo}>
                                    <button
                                        type="button"
                                        aria-label={`Photo ${position + 1}`}
                                        aria-current={position === current}
                                        onClick={() => onIndexChange(position)}
                                        className={cn(
                                            'block size-14 shrink-0 overflow-hidden rounded-md border-2 transition-opacity',
                                            position === current
                                                ? 'border-white'
                                                : 'border-transparent opacity-60 hover:opacity-100',
                                        )}
                                    >
                                        <img
                                            src={photo}
                                            alt=""
                                            className="size-full object-cover"
                                        />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

/**
 * Galerie cliquable : chaque vignette s'assombrit au survol et ouvre le
 * diaporama. Remplace les liens qui ouvraient le fichier dans un onglet.
 */
export function PhotoGallery({
    photos,
    label,
    className,
    thumbClassName = 'aspect-[4/3] w-full',
    onSetCover,
}: {
    photos: string[];
    label: string;
    className?: string;
    thumbClassName?: string;
    /** Fourni, chaque photo peut devenir la principale (la première). */
    onSetCover?: (index: number) => void;
}) {
    const [open, setOpen] = useState<number | null>(null);
    // Photo qu'on vient de désigner : sa vignette rejoue le halo une fois
    // remontée en tête, sinon la permutation passe inaperçue.
    const [justSet, setJustSet] = useState<string | null>(null);

    useEffect(() => {
        if (justSet === null || photos[0] !== justSet) {
            return;
        }

        const timer = setTimeout(() => setJustSet(null), 1000);

        return () => clearTimeout(timer);
    }, [justSet, photos]);

    return (
        <>
            <ul role="list" className={className}>
                {photos.map((photo, index) => (
                    <li
                        key={photo}
                        className={cn(
                            'group relative rounded-lg',
                            // Le halo se joue sur la vignette devenue principale.
                            index === 0 &&
                                photo === justSet &&
                                'animate-photo-cover motion-reduce:animate-none',
                        )}
                    >
                        <button
                            type="button"
                            aria-label={`Agrandir la photo ${index + 1} de ${label}`}
                            onClick={() => setOpen(index)}
                            className="relative block w-full cursor-zoom-in overflow-hidden rounded-lg border"
                        >
                            <img
                                src={photo}
                                alt={`Photo ${index + 1} de ${label}`}
                                className={cn(
                                    'object-cover transition-transform duration-200 group-hover:scale-105',
                                    thumbClassName,
                                )}
                            />
                            <span
                                aria-hidden
                                className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 text-white opacity-0 transition-all group-hover:bg-black/20 group-hover:opacity-100 group-focus-visible:bg-black/20 group-focus-visible:opacity-100"
                            >
                                <Expand className="size-5" />
                            </span>
                        </button>
                        {/* L'étoile se pose sur la photo : pleine sur la photo
                            principale, révélée au survol sur les autres. */}
                        {onSetCover &&
                            (index === 0 ? (
                                <span
                                    title="Photo principale"
                                    aria-label="Photo principale"
                                    className="bg-background/80 absolute top-2 right-2 z-10 flex size-6 items-center justify-center rounded-full text-amber-500/80 backdrop-blur-sm"
                                >
                                    <Star className="size-3.5 fill-current" />
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    aria-label={`Définir la photo ${index + 1} comme principale`}
                                    onClick={() => {
                                        setJustSet(photo);
                                        onSetCover(index);
                                    }}
                                    className={cn(
                                        'bg-background/80 absolute top-2 right-2 z-10 flex size-6 items-center justify-center rounded-full backdrop-blur-sm transition-opacity focus-visible:opacity-100',
                                        // Le clic se voit tout de suite, sans
                                        // attendre la réponse du serveur.
                                        photo === justSet
                                            ? 'text-amber-500 opacity-100'
                                            : 'text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-amber-500',
                                    )}
                                >
                                    <Star
                                        className={cn(
                                            'size-3.5',
                                            photo === justSet && 'fill-current',
                                        )}
                                    />
                                </button>
                            ))}
                    </li>
                ))}
            </ul>
            <PhotoLightbox
                photos={photos}
                label={label}
                index={open}
                onIndexChange={setOpen}
                onOpenChange={(next) => !next && setOpen(null)}
            />
        </>
    );
}
