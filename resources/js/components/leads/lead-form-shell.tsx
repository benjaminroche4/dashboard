import { Check, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type FormStep = { number: number; title: string };

/** Indicateur d'étapes, discret : numéro, libellé, filet entre les étapes. */
export function FormStepper<T extends FormStep>({
    steps,
    current,
    visited,
    onSelect,
}: {
    steps: readonly T[];
    current: T['number'];
    visited: Set<number>;
    onSelect: (step: T['number']) => void;
}) {
    return (
        <ol
            role="list"
            aria-label="Étapes"
            className="-mx-4 flex [scrollbar-width:none] items-center gap-3 overflow-x-auto px-4"
        >
            {steps.map((step, index) => {
                const done = step.number < current;
                const active = step.number === current;
                const reachable = visited.has(step.number) || done;

                return (
                    <li
                        key={step.number}
                        className={cn(
                            'flex items-center gap-3',
                            index < steps.length - 1 && 'flex-1',
                        )}
                    >
                        <button
                            type="button"
                            disabled={!reachable}
                            aria-current={active ? 'step' : undefined}
                            onClick={() => onSelect(step.number)}
                            className={cn(
                                'flex items-center gap-2 rounded-md text-sm outline-none focus-visible:ring-2 disabled:cursor-default',
                                active
                                    ? 'text-foreground font-medium'
                                    : done
                                      ? 'text-muted-foreground'
                                      : 'text-muted-foreground/50',
                                reachable && !active && 'hover:text-foreground',
                            )}
                        >
                            <span
                                aria-hidden
                                className={cn(
                                    'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums',
                                    !active && !done && 'border-dashed',
                                    active &&
                                        'bg-primary text-primary-foreground border-primary',
                                    done &&
                                        'bg-primary/10 border-primary/40 text-primary',
                                )}
                            >
                                {done ? (
                                    <Check className="size-3.5" />
                                ) : (
                                    step.number
                                )}
                            </span>
                            <span className="whitespace-nowrap">
                                {step.title}
                            </span>
                        </button>
                        {index < steps.length - 1 && (
                            <span
                                aria-hidden
                                className={cn(
                                    'h-px flex-1',
                                    done ? 'bg-primary/40' : 'bg-border',
                                )}
                            />
                        )}
                    </li>
                );
            })}
        </ol>
    );
}

/** Groupe de champs en panneau, comme la fiche lead : icône, titre, aide, grille. */
export function FormGroup({
    title,
    hint,
    icon: Icon,
    children,
    className,
}: {
    title: string;
    hint?: string;
    icon?: LucideIcon;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            aria-label={title}
            className={cn(
                'bg-sidebar grid content-start gap-5 rounded-xl border p-5',
                className,
            )}
        >
            <div className="flex items-start gap-3">
                {Icon && (
                    <span
                        aria-hidden
                        className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg"
                    >
                        <Icon className="size-4" />
                    </span>
                )}
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold">{title}</h2>
                    {hint && (
                        <p className="text-muted-foreground text-xs">{hint}</p>
                    )}
                </div>
            </div>
            {children}
        </section>
    );
}

/** Libellé, champ, aide et erreur ; le fond du champ se teinte en erreur. */
export function FormField({
    label,
    htmlFor,
    error,
    hint,
    children,
    className,
}: {
    label: string;
    htmlFor?: string;
    error?: string;
    hint?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'grid content-start gap-2',
                // Champ en erreur : fond teinté en plus de la bordure, plus visible sur mobile.
                '[&_input[aria-invalid=true]]:bg-destructive/5 [&_textarea[aria-invalid=true]]:bg-destructive/5',
                className,
            )}
        >
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
            {hint && !error && (
                <p className="text-muted-foreground text-xs">{hint}</p>
            )}
            <InputError message={error} />
        </div>
    );
}
