import {
    Archive,
    CalendarClock,
    CircleCheck,
    CircleHelp,
    CircleX,
    type LucideIcon,
} from 'lucide-react';
import { AiBadge } from '@/components/ai-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { parisFormat } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import type { LeadVerdict, LeadVerdictInfo } from '@/types';

const dateTime = parisFormat({
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
});

/** Trois teintes : vert qualifié, rouge non qualifié, gris neutre. */
const tones: Record<
    LeadVerdict,
    { icon: LucideIcon; card: string; badge: string }
> = {
    qualified: {
        icon: CircleCheck,
        card: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/40',
        badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    },
    not_qualified: {
        icon: CircleX,
        card: 'border-red-200 bg-red-50/70 dark:border-red-900 dark:bg-red-950/40',
        badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    },
    neutral: {
        icon: CircleHelp,
        card: 'bg-sidebar',
        badge: 'bg-muted text-muted-foreground',
    },
};

/**
 * **AI check** : l'avis de l'assistant sur le lead, juste au-dessus du
 * message reçu (décision du 28 octobre 2026, style retenu parmi vingt-et-une
 * variantes). Deux pastilles en tête, « AI check » violette puis l'avis
 * teinté, la date à droite, le motif en dessous ; le fond de l'encart suit
 * l'avis : vert « Qualifié », rouge « Non qualifié », gris « À vérifier ».
 * Sans avis, rien ne s'affiche ; l'analyse se relance depuis le menu « ⋯ ».
 * Un avis rouge propose « Archiver avec ce motif » (motif « Pas du tout
 * qualifié », précision = la raison de l'assistant), un avis vert
 * « Planifier le premier contact » : l'avis est un raccourci, pas une étiquette.
 */
export function LeadAiCheck({
    verdict,
    className,
    onArchive,
    onPlan,
}: {
    verdict: LeadVerdictInfo | null;
    className?: string;
    /** Avis rouge : archiver le lead avec ce motif (ouvre le dialogue prérempli). */
    onArchive?: () => void;
    /** Avis vert : planifier le premier contact (ouvre la modale de recontact). */
    onPlan?: () => void;
}) {
    if (verdict === null) {
        return null;
    }

    const tone = tones[verdict.value];
    const Icon = tone.icon;

    return (
        <section
            aria-label="AI check"
            data-testid="lead-ai-check"
            data-verdict={verdict.value}
            className={cn(
                'grid gap-1.5 rounded-xl border p-3',
                tone.card,
                className,
            )}
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-1.5">
                    <AiBadge label="AI check" />
                    <Badge
                        variant="secondary"
                        className={cn('gap-1 font-medium', tone.badge)}
                    >
                        <Icon className="size-3" aria-hidden />
                        {verdict.label}
                    </Badge>
                </h2>
                {verdict.at && (
                    <span className="text-muted-foreground text-xs">
                        {dateTime.format(new Date(verdict.at))}
                    </span>
                )}
            </div>
            {verdict.reason && (
                <p className="text-sm/6 text-pretty">{verdict.reason}</p>
            )}
            {/* L'avis propose le geste qui en découle, il ne fait pas qu'étiqueter. */}
            {verdict.value === 'not_qualified' && onArchive && (
                <div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="bg-background"
                        onClick={onArchive}
                    >
                        <Archive aria-hidden />
                        Archiver avec ce motif
                    </Button>
                </div>
            )}
            {verdict.value === 'qualified' && onPlan && (
                <div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="bg-background"
                        onClick={onPlan}
                    >
                        <CalendarClock aria-hidden />
                        Planifier le premier contact
                    </Button>
                </div>
            )}
        </section>
    );
}
