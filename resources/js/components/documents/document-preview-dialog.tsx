import { Download, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/** Le fichier à lire : son nom, son adresse d'aperçu et celle du téléchargement. */
export type PreviewedFile = {
    name: string;
    /** Adresse servie « inline », lue puis affichée dans le cadre. */
    url: string;
    /** Téléchargement, quand il est proposé. */
    downloadUrl?: string;
};

/**
 * Le fichier est lu en `fetch` puis affiché depuis une URL `blob:` locale,
 * jamais directement par son adresse : en production, la plateforme pose
 * `X-Frame-Options: deny` sur chaque réponse et le navigateur refuse alors
 * d'encadrer la page (« dashboard… n'autorise pas la connexion »). Un blob
 * appartient au document, l'en-tête ne s'y applique pas.
 */
function useBlobUrl(url: string | null): {
    src: string | null;
    failed: boolean;
} {
    const [src, setSrc] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setSrc(null);
        setFailed(false);

        if (!url) {
            return;
        }

        let cancelled = false;
        let objectUrl: string | null = null;

        fetch(url, {
            credentials: 'same-origin',
            headers: { Accept: 'application/pdf' },
        })
            .then((response) =>
                response.ok ? response.blob() : Promise.reject(response.status),
            )
            .then((blob) => {
                if (cancelled) {
                    return;
                }

                objectUrl = URL.createObjectURL(blob);
                setSrc(objectUrl);
            })
            .catch(() => !cancelled && setFailed(true));

        return () => {
            cancelled = true;

            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [url]);

    return { src, failed };
}

/**
 * Lecture d'une pièce sans la télécharger : le PDF s'affiche dans la page,
 * comme sur un espace de fichiers. Le téléchargement reste à portée, et
 * « Ouvrir dans un onglet » garde un chemin si l'aperçu ne se charge pas.
 */
export function DocumentPreviewDialog({
    file,
    onOpenChange,
    downloadLabel = 'Télécharger',
}: {
    /** Fichier ouvert, ou `null` quand la visionneuse est fermée. */
    file: PreviewedFile | null;
    onOpenChange: (open: boolean) => void;
    downloadLabel?: string;
}) {
    const { src, failed } = useBlobUrl(file?.url ?? null);

    return (
        <Dialog open={file !== null} onOpenChange={onOpenChange}>
            <DialogContent
                // Une pièce d'identité se lit en grand : la visionneuse prend
                // la place que l'écran lui laisse.
                className="flex h-[calc(100dvh-4rem)] flex-col gap-3 p-4 sm:max-w-4xl"
            >
                <DialogHeader className="gap-1">
                    <DialogTitle className="truncate">{file?.name}</DialogTitle>
                    <DialogDescription className="sr-only">
                        Aperçu du document, sans téléchargement.
                    </DialogDescription>
                </DialogHeader>
                {file && (
                    <>
                        {src ? (
                            <iframe
                                src={src}
                                title={`Aperçu de ${file.name}`}
                                className="bg-muted/40 min-h-0 w-full flex-1 rounded-lg border"
                            />
                        ) : (
                            <p
                                role="status"
                                className="text-muted-foreground bg-muted/40 flex min-h-0 flex-1 items-center justify-center rounded-lg border text-sm"
                            >
                                {failed
                                    ? 'L’aperçu n’a pas pu être chargé : ouvrez le fichier dans un onglet.'
                                    : 'Chargement de l’aperçu…'}
                            </p>
                        )}
                        <div className="flex flex-wrap justify-end gap-2">
                            <Button variant="ghost" size="sm" asChild>
                                <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <ExternalLink aria-hidden />
                                    Ouvrir dans un onglet
                                </a>
                            </Button>
                            {file.downloadUrl && (
                                <Button variant="outline" size="sm" asChild>
                                    <a href={file.downloadUrl}>
                                        <Download aria-hidden />
                                        {downloadLabel}
                                    </a>
                                </Button>
                            )}
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
