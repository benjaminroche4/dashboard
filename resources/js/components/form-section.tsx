import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Bloc d'un formulaire : carte blanche, en-tête à pictogramme séparé des
 * champs par un filet, puis le contenu. C'est le style de référence des
 * formulaires du backoffice (celui de « Planifier une visite ») : tout
 * formulaire s'y conforme.
 */
export function FormSection({
    title,
    hint,
    icon: Icon,
    action,
    variant = 'card',
    className,
    children,
}: {
    title: string;
    /** Une phrase courte sous le titre, pour dire à quoi sert le bloc. */
    hint?: string;
    icon?: LucideIcon;
    /** Bouton ou badge aligné à droite de l'en-tête. */
    action?: ReactNode;
    /**
     * `card` (défaut) sur une page : carte blanche sur le fond de la page.
     * `plain` dans un dialogue, qui est déjà une carte : en-tête seul.
     */
    variant?: 'card' | 'plain';
    className?: string;
    children: ReactNode;
}) {
    return (
        <section
            aria-label={title}
            className={cn(
                'grid gap-4',
                variant === 'card' && 'bg-background rounded-lg border p-4',
                className,
            )}
        >
            <div className="flex items-start gap-3 border-b pb-3">
                {Icon && (
                    <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                        <Icon className="size-4" aria-hidden />
                    </span>
                )}
                <div className="grid flex-1 gap-0.5">
                    <h2 className="text-sm font-medium">{title}</h2>
                    {hint && (
                        <p className="text-muted-foreground text-xs">{hint}</p>
                    )}
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}

/** Grille de champs d'un bloc : une colonne, deux à partir de `sm`. */
export function FormGrid({
    columns = 2,
    className,
    children,
}: {
    columns?: 1 | 2 | 3;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div
            className={cn(
                'grid grid-cols-1 items-start gap-4',
                columns === 2 && 'sm:grid-cols-2',
                columns === 3 && 'sm:grid-cols-3',
                className,
            )}
        >
            {children}
        </div>
    );
}
