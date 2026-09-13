import { Link } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, Clock, FileStack } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { create as documentCreate } from '@/routes/tools/documents';
import type { DossierReadiness, DossierStatus } from '@/types';

/** Teinte, pictogramme et phrase d'un état de dossier. */
const tones: Record<
    DossierStatus,
    { icon: LucideIcon; badge: string; bar: string; text: string }
> = {
    not_started: {
        icon: FileStack,
        badge: 'bg-muted text-muted-foreground',
        bar: 'bg-muted-foreground/40',
        text: 'text-muted-foreground',
    },
    incomplete: {
        icon: AlertTriangle,
        badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
        bar: 'bg-amber-500',
        text: 'text-amber-700 dark:text-amber-300',
    },
    to_check: {
        icon: Clock,
        badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
        bar: 'bg-blue-500',
        text: 'text-blue-700 dark:text-blue-300',
    },
    ready: {
        icon: CheckCircle2,
        badge: 'bg-green-600/15 text-green-800 dark:text-green-300',
        bar: 'bg-green-600',
        text: 'text-green-800 dark:text-green-300',
    },
};

/**
 * Ce qu'il reste à faire sur le dossier, en une phrase : les pièces qui
 * manquent d'abord, puis celles à redéposer, puis celles à vérifier.
 * Calcul pur, testé avec le composant.
 */
export function readinessSummary(readiness: DossierReadiness): string {
    if (readiness.status === 'not_started') {
        return 'Aucune liste de pièces';
    }

    const parts: string[] = [];

    if (readiness.missing > 0) {
        parts.push(
            `${readiness.missing} manquante${plural(readiness.missing)}`,
        );
    }

    if (readiness.refused > 0) {
        parts.push(`${readiness.refused} à redéposer`);
    }

    if (readiness.to_check > 0) {
        parts.push(`${readiness.to_check} à vérifier`);
    }

    return parts.length === 0
        ? `${readiness.total} pièce${plural(readiness.total)} validée${plural(readiness.total)}`
        : parts.join(' · ');
}

function plural(count: number): string {
    return count > 1 ? 's' : '';
}

/**
 * Indicateur compact pour la rangée de chiffres du dossier : l'état en
 * toutes lettres, la part validée et ce qui bloque.
 */
export function DossierReadinessStat({
    readiness,
}: {
    readiness: DossierReadiness;
}) {
    const tone = tones[readiness.status];
    const Icon = tone.icon;

    return (
        <div className="grid gap-1.5">
            <p
                className={cn(
                    'flex items-center gap-1.5 text-xl font-semibold',
                    tone.text,
                )}
            >
                <Icon className="size-5 shrink-0" aria-hidden />
                {readiness.status_label}
            </p>
            {readiness.total > 0 && (
                <div
                    role="progressbar"
                    aria-label="Pièces validées"
                    aria-valuenow={readiness.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="bg-muted h-1.5 overflow-hidden rounded-full"
                >
                    <div
                        className={cn('h-full rounded-full', tone.bar)}
                        style={{ width: `${readiness.percent}%` }}
                    />
                </div>
            )}
            <p className="text-muted-foreground truncate text-xs">
                {readinessSummary(readiness)}
            </p>
        </div>
    );
}

/**
 * Carte de l'aperçu : le détail des pièces (validées, à vérifier, à
 * redéposer, manquantes) et le raccourci vers la liste à créer.
 */
export function DossierReadinessCard({
    readiness,
    leadUuid,
    onOpenDocuments,
}: {
    readiness: DossierReadiness;
    leadUuid: string;
    /** Ouvre l'onglet Documents, où les pièces se vérifient. */
    onOpenDocuments?: () => void;
}) {
    const tone = tones[readiness.status];
    const Icon = tone.icon;

    if (readiness.status === 'not_started') {
        return (
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-muted-foreground text-sm">
                    Aucune liste de pièces n’a été créée : le dossier ne peut
                    pas encore être présenté.
                </p>
                <Button variant="outline" size="sm" asChild>
                    <Link
                        href={documentCreate({ query: { lead: leadUuid } })}
                        prefetch
                    >
                        Créer une liste de pièces
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p
                    className={cn(
                        'flex items-center gap-2 text-sm font-medium',
                        tone.text,
                    )}
                >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {readiness.status_label}
                    <span className="text-muted-foreground font-normal tabular-nums">
                        {readiness.accepted}/{readiness.total} pièces validées
                    </span>
                </p>
                {onOpenDocuments && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onOpenDocuments}
                    >
                        Voir les pièces
                    </Button>
                )}
            </div>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Count label="Validées" value={readiness.accepted} />
                <Count label="À vérifier" value={readiness.to_check} />
                <Count label="À redéposer" value={readiness.refused} />
                <Count label="Manquantes" value={readiness.missing} />
            </dl>
        </div>
    );
}

function Count({ label, value }: { label: string; value: number }) {
    return (
        <div className="bg-muted/40 grid gap-0.5 rounded-lg px-3 py-2">
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className="text-base font-semibold tabular-nums">{value}</dd>
        </div>
    );
}
