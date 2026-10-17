import { router } from '@inertiajs/react';
import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { parisFormat } from '@/lib/datetime';
import { brief as requestBrief } from '@/routes/tools/documents';
import type { DocumentRequestDetail } from '@/types';

const generatedOn = parisFormat({ day: 'numeric', month: 'long' });

/**
 * « Dossier fusionné » quand la synthèse IA manque ou est périmée : on décide
 * ici, au moment où l'on demande le dossier, plutôt que par un bouton à
 * trouver ailleurs. La synthèse prend quelques minutes et ne peut pas être
 * attendue dans la modale : cochée, elle part en arrière-plan et le toast de
 * fin propose le téléchargement ; décochée, le dossier se fusionne tout de
 * suite avec la page de garde simple. Dossier complet ou non, la synthèse se
 * fait sur les pièces validées et nomme ce qui manque.
 */
export function DossierMergeDialog({
    request,
    open,
    onOpenChange,
    onMergeNow,
}: {
    request: DocumentRequestDetail;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Fusion immédiate : avec la synthèse à jour, ou sans synthèse du tout. */
    onMergeNow: (withBrief: boolean) => void;
}) {
    const [withBrief, setWithBrief] = useState(true);
    const [force, setForce] = useState(false);
    const [busy, setBusy] = useState(false);
    const exists =
        request.brief?.cover !== null && request.brief?.cover !== undefined;
    const fresh = exists && request.brief?.fresh === true;
    const stale = exists && !fresh;
    const validated = request.valid_uploads_count ?? 0;
    const missing = request.missing_count ?? 0;
    const generatedAt = request.brief?.generated_at ?? null;

    useEffect(() => {
        if (open) {
            setWithBrief(true);
            setForce(false);
        }
    }, [open]);

    const confirm = () => {
        // Sans synthèse, ou avec une synthèse à jour qu'on garde : rien à générer, on fusionne.
        if (!withBrief || (fresh && !force)) {
            onOpenChange(false);
            onMergeNow(withBrief);

            return;
        }

        setBusy(true);
        router.post(
            requestBrief({ documentRequest: request.uuid }).url,
            force ? { force: true } : {},
            {
                preserveScroll: true,
                onSuccess: () => onOpenChange(false),
                onFinish: () => setBusy(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>Dossier fusionné</DialogTitle>
                <DialogDescription>
                    {validated} pièce(s) validée(s)
                    {missing > 0 && (
                        <>
                            , {missing} encore attendue(s) : la synthèse se fait
                            sur ce qui est validé
                        </>
                    )}
                    .
                </DialogDescription>

                <Label
                    htmlFor="merge-with-brief"
                    className="bg-background has-data-[state=checked]:border-primary flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 font-normal"
                >
                    <Checkbox
                        id="merge-with-brief"
                        checked={withBrief}
                        onCheckedChange={(checked) =>
                            setWithBrief(checked === true)
                        }
                        className="mt-0.5"
                    />
                    <span className="grid gap-1">
                        <span className="flex items-center gap-2 font-medium">
                            <Sparkles className="size-4" aria-hidden />
                            {fresh
                                ? 'Inclure la page de garde IA'
                                : stale
                                  ? 'Mettre à jour la synthèse IA'
                                  : 'Générer une synthèse IA'}
                        </span>
                        <span className="text-muted-foreground text-sm">
                            {fresh && generatedAt
                                ? `Synthèse du ${generatedOn.format(new Date(generatedAt))}, à jour des pièces validées : profil des locataires et fiches en tête de chaque partie, sans nouvelle lecture.`
                                : stale && generatedAt
                                  ? `Les pièces ont changé depuis la synthèse du ${generatedOn.format(new Date(generatedAt))} : seules les parties modifiées sont relues. Quelques minutes : vous serez prévenu, et le dossier se téléchargera alors avec la synthèse.`
                                  : 'Profil chiffré des locataires sur la page de garde et fiche récapitulative en tête de chaque partie. Quelques minutes : vous serez prévenu, et le dossier se téléchargera alors avec la synthèse.'}
                        </span>
                    </span>
                </Label>

                {/* Relire toutes les parties, même inchangées : après un
                    changement de consigne ou une lecture ratée. Coûteux, donc
                    décoché et discret. */}
                {exists && withBrief && (
                    <Label
                        htmlFor="merge-force"
                        className="text-muted-foreground flex cursor-pointer items-center gap-2 px-1 text-sm font-normal"
                    >
                        <Checkbox
                            id="merge-force"
                            checked={force}
                            onCheckedChange={(checked) =>
                                setForce(checked === true)
                            }
                        />
                        Forcer la régénération : toutes les parties sont relues,
                        pas seulement celles qui ont changé.
                    </Label>
                )}

                <DialogFooter className="gap-2">
                    <DialogClose asChild>
                        <Button variant="secondary">Annuler</Button>
                    </DialogClose>
                    <Button disabled={busy} onClick={confirm}>
                        {busy && <Spinner />}
                        {!withBrief
                            ? 'Télécharger sans synthèse'
                            : force
                              ? 'Régénérer puis télécharger'
                              : fresh
                                ? 'Télécharger'
                                : stale
                                  ? 'Mettre à jour puis télécharger'
                                  : 'Générer puis télécharger'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
