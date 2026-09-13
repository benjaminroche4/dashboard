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
