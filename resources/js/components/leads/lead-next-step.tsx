import { AlarmClock, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { LeadNextStep as Step } from '@/lib/lead-next-step';
import { cn } from '@/lib/utils';

/**
 * Bandeau fin en tête de la fiche : le prochain geste sur le lead, dit en
 * une phrase et un bouton (« Recontact en retard de 37 j · Reporter »).
 * Rouge quand on est en retard, ambre quand c'est pour aujourd'hui ; absent
 * quand rien n'attend.
 */
export function LeadNextStep({
    step,
    onRecontact,
    onTouch,
    touching = false,
}: {
    step: Step | null;
    /** Ouvre la modale « Planifier » / « Reporter ». */
    onRecontact: () => void;
    /** Note le contact maintenant. */
    onTouch: () => void;
    touching?: boolean;
}) {
    if (step === null) {
        return null;
    }

    const Icon = step.action === 'recontact' ? CalendarClock : AlarmClock;

    return (
        <div
            role="status"
            data-testid="lead-next-step"
            data-tone={step.tone}
            className={cn(
                'flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-sm',
                step.tone === 'late'
                    ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'
                    : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
            )}
        >
            <span className="flex min-w-0 items-center gap-2 font-medium">
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{step.text}</span>
            </span>
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-background"
                disabled={touching && step.action === 'touch'}
                onClick={step.action === 'recontact' ? onRecontact : onTouch}
            >
                {touching && step.action === 'touch' && <Spinner />}
                {step.label}
            </Button>
        </div>
    );
}
