import { router } from '@inertiajs/react';
import { Check, ChevronDown, Clock } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { parisFormat } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import { status as propertyStatus } from '@/routes/clients/properties';
import type { PropertyApplicationStatus, PropertyStatusOption } from '@/types';

/**
 * Teinte par étape : ambre tant que le client n'a pas tranché — c'est ce qui
 * demande une action —, vert obtenu, rouge hors course.
 */
export const outcomeTones: Record<PropertyApplicationStatus, string> = {
    pending:
        'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    declined: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
    applied: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    accepted:
        'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
    rejected:
        'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
};

/**
 * L'étape en cours, en badge. « À décider » se voit — c'est la seule étape qui
 * attend quelque chose de nous — et rappelle depuis combien de jours la visite
 * est passée ; au-delà du délai de relance, il passe à l'orange.
 */
export function PropertyOutcomeBadge({
    status,
    label,
    className,
    visitedAt = null,
    due = false,
}: {
    status: PropertyApplicationStatus;
    label: string;
    className?: string;
    /** Dernière visite effectuée sur ce bien, d'où court l'attente. */
    visitedAt?: string | null;
    /** La décision tarde : le rappel est parti ou part bientôt. */
    due?: boolean;
}) {
    const waiting = status === 'pending' ? waitingDays(visitedAt) : null;
    const tone =
        status === 'pending' && due ? pendingDueTone : outcomeTones[status];

    return (
        <Badge
            variant="secondary"
            data-status={status}
            data-due={status === 'pending' && due ? '' : undefined}
            className={cn('font-medium', tone, className)}
        >
            {status === 'pending' && (
                <Clock className="size-3.5 shrink-0" aria-hidden />
            )}
            {label}
            {waiting !== null && (
                <span className="tabular-nums">· {waiting} j</span>
            )}
        </Badge>
    );
}

/** Ambre qui vire à l'orange quand la décision traîne. */
const pendingDueTone =
    'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300';

/** Jours pleins écoulés depuis la visite, à partir du premier. */
export function waitingDays(visitedAt: string | null): number | null {
    if (visitedAt === null) {
        return null;
    }

    const days = Math.floor(
        (Date.now() - new Date(visitedAt).getTime()) / 86_400_000,
    );

    return days < 1 ? null : days;
}

/**
 * Suite donnée à un bien visité, pour un dossier : le client se positionne ou
 * non, puis sa candidature aboutit ou non. Même menu sur la fiche d'une visite
 * et dans l'onglet « Biens » du dossier.
 */
export function PropertyOutcomeMenu({
    clientUuid,
    propertyUuid,
    propertyLabel,
    status,
    options,
    size = 'sm',
}: {
    clientUuid: string;
    propertyUuid: string;
    propertyLabel: string;
    status: PropertyApplicationStatus;
    options: PropertyStatusOption[];
    size?: 'sm' | 'default';
}) {
    const [busy, setBusy] = useState(false);
    const current = options.find((option) => option.value === status);

    const choose = (next: PropertyApplicationStatus) => {
        if (next === status) {
            return;
        }

        setBusy(true);
        router.patch(
            propertyStatus({ lead: clientUuid, property: propertyUuid }).url,
            { status: next },
            { preserveScroll: true, onFinish: () => setBusy(false) },
        );
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size={size}
                    disabled={busy}
                    aria-label={`Suite de la visite de ${propertyLabel}`}
                >
                    {busy ? <Spinner /> : null}
                    {current?.label ?? 'À décider'}
                    <ChevronDown aria-hidden />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
                {options.map((option) => (
                    <DropdownMenuItem
                        key={option.value}
                        onSelect={() => choose(option.value)}
                        className="items-start gap-2"
                    >
                        <Check
                            aria-hidden
                            className={cn(
                                'mt-0.5 size-4 shrink-0',
                                option.value !== status && 'invisible',
                            )}
                        />
                        <span className="grid gap-0.5">
                            <span className="font-medium">{option.label}</span>
                            <span className="text-muted-foreground text-xs">
                                {option.hint}
                            </span>
                        </span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/** Date courte et lisible, heure de Paris : « 14 sept. à 09:00 ». */
function moment(iso: string): string {
    const date = new Date(iso);

    return `${day(iso)} à ${parisFormat({ hour: '2-digit', minute: '2-digit' }).format(date)}`;
}

/** Date seule, heure de Paris : « 14 sept. ». */
function day(iso: string): string {
    return parisFormat({ day: 'numeric', month: 'short' }).format(
        new Date(iso),
    );
}

/**
 * Ce que le suivi raconte à cette étape, en une ou deux phrases : depuis quand
 * le bien en est là, et ce que l'équipe fait ensuite. Calcul pur, testé.
 *
 * La relance est un e-mail **aux personnes de suivi du dossier**, pas au
 * client : c'est l'équipe qui rappelle le client, jamais le robot.
 */
export function followUpLines(outcome: {
    status: PropertyApplicationStatus;
    status_at?: string | null;
    visited_at?: string | null;
    reminded_at?: string | null;
    reminder_at?: string | null;
}): string[] {
    const lines: string[] = [];

    if (outcome.status === 'pending') {
        if (outcome.visited_at) {
            lines.push(`Visité le ${day(outcome.visited_at)}`);
        }

        if (outcome.reminded_at) {
            lines.push(`Équipe relancée le ${moment(outcome.reminded_at)}`);
        }

        if (outcome.reminder_at) {
            const future = new Date(outcome.reminder_at).getTime() > Date.now();

            lines.push(
                future
                    ? `Prochaine relance le ${moment(outcome.reminder_at)}`
                    : 'Relance en partance',
            );
        }

        return lines;
    }

    if (outcome.status_at) {
        const since = day(outcome.status_at);

        lines.push(
            outcome.status === 'applied'
                ? `Dossier déposé le ${since}, en attente de réponse`
                : `Tranché le ${since}`,
        );
    }

    return lines;
}

/**
 * Suivi d'un bien visité : l'étape, sa phrase d'explication, puis les dates
 * qui disent où l'on en est et quand l'équipe est relancée.
 */
export function PropertyFollowUp({
    outcome,
    className,
}: {
    outcome: {
        status: PropertyApplicationStatus;
        status_label: string;
        options: PropertyStatusOption[];
        status_at?: string | null;
        visited_at?: string | null;
        reminded_at?: string | null;
        reminder_at?: string | null;
        decision_due?: boolean;
    };
    className?: string;
}) {
    const hint = outcome.options.find(
        (option) => option.value === outcome.status,
    )?.hint;
    const lines = followUpLines(outcome);

    return (
        <div className={cn('grid gap-2', className)}>
            <div className="flex flex-wrap items-center gap-2">
                <PropertyOutcomeBadge
                    status={outcome.status}
                    label={outcome.status_label}
                    visitedAt={outcome.visited_at ?? null}
                    due={outcome.decision_due ?? false}
                />
                {hint && (
                    <p className="text-muted-foreground text-sm">{hint}</p>
                )}
            </div>
            {lines.length > 0 && (
                <ul
                    role="list"
                    aria-label="Suivi de la décision"
                    className="text-muted-foreground grid gap-1 text-xs"
                >
                    {lines.map((line) => (
                        <li key={line} className="flex items-center gap-1.5">
                            <Clock className="size-3 shrink-0" aria-hidden />
                            {line}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
