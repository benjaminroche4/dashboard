import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Référence « LD-XXXX » du lead : un clic la copie, la puce passe en vert
 * avec une coche et « Copié » pendant un instant.
 */
export function LeadReference({
    reference,
    className,
    resetAfter = 1500,
}: {
    reference: string;
    className?: string;
    /** Durée d'affichage de l'état « Copié », en ms. */
    resetAfter?: number;
}) {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) {
            return;
        }

        const timer = setTimeout(() => setCopied(false), resetAfter);

        return () => clearTimeout(timer);
    }, [copied, resetAfter]);

    const copy = async () => {
        try {
            await navigator.clipboard?.writeText(reference);
        } catch {
            // Presse-papiers indisponible (contexte non sécurisé) : l'effet reste un simple repère.
        }

        setCopied(true);
    };

    return (
        <button
            type="button"
            title="Copier la référence"
            aria-label={
                copied ? 'Référence copiée' : `Copier la référence ${reference}`
            }
            data-copied={copied ? 'true' : undefined}
            onClick={() => void copy()}
            className={cn(
                'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-xs tabular-nums transition-[color,background-color,border-color,transform] duration-200 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100',
                copied
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                className,
            )}
        >
            {reference}
            <span className="relative size-3" aria-hidden>
                <Copy
                    className={cn(
                        'absolute inset-0 size-3 transition-[opacity,transform] duration-200',
                        copied && 'scale-50 opacity-0',
                    )}
                />
                <Check
                    className={cn(
                        'absolute inset-0 size-3 transition-[opacity,transform] duration-200',
                        copied ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
                    )}
                />
            </span>
            <span
                className={cn(
                    'overflow-hidden transition-[max-width,opacity] duration-200',
                    copied ? 'max-w-12 opacity-100' : 'max-w-0 opacity-0',
                )}
            >
                Copié
            </span>
        </button>
    );
}
