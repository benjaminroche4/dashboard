import { router } from '@inertiajs/react';
import {
    Circle,
    CircleCheck,
    CircleDashed,
    Download,
    Loader2,
    Sparkles,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { DocumentRequestDetail, DossierBriefStep } from '@/types';

/** Toutes les 4 s tant que l'assistant travaille : le job écrit l'avancement en base. */
export const PROGRESS_POLL_MS = 4_000;

const stateIcon = (state: DossierBriefStep['state']) => {
    switch (state) {
        case 'done':
            return (
                <CircleCheck className="size-4 text-emerald-600" aria-hidden />
            );
        case 'kept':
            return (
                <CircleDashed className="size-4 text-emerald-600" aria-hidden />
            );
        case 'reading':
            return (
                <Loader2
                    className="text-primary size-4 animate-spin motion-reduce:animate-none"
                    aria-hidden
                />
            );
        default:
            return (
                <Circle
                    className="text-muted-foreground/50 size-4"
                    aria-hidden
                />
            );
    }
};

const stateLabel: Record<DossierBriefStep['state'], string> = {
    pending: 'à lire',
    reading: 'en lecture',
    done: 'lue',
    kept: 'gardée',
};

/**
 * Le suivi de la synthèse IA, en bas à droite comme un toast qui reste : une
 * ligne par partie du dossier avec son état, puis la page de garde. La page
 * relit l'avancement toutes les quelques secondes tant que l'assistant
 * travaille ; à la fin, le panneau propose le téléchargement du dossier
 * fusionné, puis se ferme.
 */
export function DossierBriefProgress({
    request,
    onDownload,
}: {
    request: DocumentRequestDetail;
    onDownload: () => void;
}) {
    const pending = request.brief?.pending === true;
    const progress = request.brief?.progress ?? null;
    const ready =
        request.brief?.cover !== null && request.brief?.cover !== undefined;
    const wasPending = useRef(false);
    const [finished, setFinished] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    // Relecture périodique des props tant que la synthèse est en cours.
    useEffect(() => {
        if (!pending) {
            return;
        }

        const timer = window.setInterval(
            () => router.reload({ only: ['request'] }),
            PROGRESS_POLL_MS,
        );

        return () => window.clearInterval(timer);
    }, [pending]);

    // La fin se détecte au passage « en cours » → « prête » : le panneau reste
    // alors ouvert avec le téléchargement, jusqu'à ce qu'on le ferme.
    useEffect(() => {
        if (pending) {
            wasPending.current = true;
            setFinished(false);
            setDismissed(false);
        } else if (wasPending.current) {
            wasPending.current = false;
            setFinished(ready);
        }
    }, [pending, ready]);

    if (dismissed || (!pending && !finished)) {
        return null;
    }

    return (
        <aside
            className="bg-popover text-popover-foreground fixed right-4 bottom-4 z-40 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border p-4 shadow-lg"
            role="status"
            aria-live="polite"
            aria-label="Synthèse IA"
        >
            <div className="flex items-center gap-2">
                {pending ? (
                    <Loader2
                        className="text-primary size-4 animate-spin motion-reduce:animate-none"
                        aria-hidden
                    />
                ) : (
                    <CircleCheck
                        className="size-4 text-emerald-600"
                        aria-hidden
                    />
                )}
                <span className="text-sm font-medium">
                    {pending ? 'Synthèse IA en cours' : 'Synthèse IA prête'}
                </span>
                {pending && progress && (
                    <span className="text-muted-foreground text-xs tabular-nums">
                        {progress.done}/{progress.total}
                    </span>
                )}
                {!pending && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto size-7"
                        aria-label="Fermer"
                        onClick={() => setDismissed(true)}
                    >
                        <X aria-hidden />
                    </Button>
                )}
            </div>

            {pending && progress && (
                <>
                    <div
                        className="bg-muted mt-3 h-1.5 overflow-hidden rounded-full"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={progress.total}
                        aria-valuenow={progress.done}
                    >
                        <div
                            className="bg-primary h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                            style={{
                                width: `${progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0}%`,
                            }}
                        />
                    </div>
                    <ol className="mt-3 grid gap-1.5 text-sm">
                        {progress.steps.map((step) => (
                            <li
                                key={step.key}
                                className="flex items-center gap-2"
                                data-state={step.state}
                            >
                                {stateIcon(step.state)}
                                <span className="min-w-0 flex-1 truncate">
                                    {step.label}
                                    {step.person && (
                                        <span className="text-muted-foreground">
                                            {' '}
                                            · {step.person}
                                        </span>
                                    )}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                    {stateLabel[step.state]}
                                </span>
                            </li>
                        ))}
                    </ol>
                </>
            )}

            {pending && !progress && (
                <p className="text-muted-foreground mt-2 flex items-center gap-2 text-sm">
                    <Sparkles className="size-4" aria-hidden />
                    L’assistant démarre la lecture des pièces.
                </p>
            )}

            {!pending && (
                <Button className="mt-3 w-full" onClick={onDownload}>
                    <Download aria-hidden />
                    Télécharger le dossier fusionné
                </Button>
            )}
        </aside>
    );
}
