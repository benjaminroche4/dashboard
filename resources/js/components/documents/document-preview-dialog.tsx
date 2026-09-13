import { Download, ExternalLink } from 'lucide-react';
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
    /** Adresse servie « inline », affichée dans le cadre. */
    url: string;
    /** Téléchargement, quand il est proposé. */
    downloadUrl?: string;
};

/**
 * Lecture d'une pièce sans la télécharger : le PDF s'affiche dans la page,
 * comme sur un espace de fichiers. Le téléchargement reste à portée, et un
 * navigateur qui refuse d'afficher le cadre garde le lien « Ouvrir dans un
 * onglet ».
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
                        <iframe
                            src={file.url}
                            title={`Aperçu de ${file.name}`}
                            className="bg-muted/40 min-h-0 w-full flex-1 rounded-lg border"
                        />
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
