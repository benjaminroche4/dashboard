import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
    title: string;
    /** Phrase d'aide sous le titre. */
    description?: string;
    /** Élément aligné à droite du titre (badge, menu, bouton). */
    action?: ReactNode;
    /** Ton rouge pour les zones dangereuses (suppression, désactivation). */
    tone?: 'default' | 'destructive';
    children: ReactNode;
    className?: string;
    /** Ancre HTML, pour les liens internes vers le panneau. */
    id?: string;
};

/**
 * Panneau standard du backoffice : fond « sidebar », bord arrondi, titre
 * discret. Utilisé par la fiche lead, la facture et les paramètres du compte.
 */
export function Panel({
    title,
    description,
    action,
    tone = 'default',
    children,
    className,
    id,
}: Props) {
    return (
        <section
            id={id}
            aria-label={title}
            className={cn(
                'bg-sidebar rounded-xl border',
                tone === 'destructive' &&
                    'border-red-200 bg-red-50/60 dark:border-red-900/60 dark:bg-red-950/30',
                className,
            )}
        >
            <header className="flex flex-wrap items-start justify-between gap-2 px-4 pt-4 pb-3">
                <div className="min-w-0">
                    <h2
                        className={cn(
                            'text-sm font-medium',
                            tone === 'destructive' &&
                                'text-red-700 dark:text-red-300',
                        )}
                    >
                        {title}
                    </h2>
                    {description && (
                        <p className="text-muted-foreground text-sm">
                            {description}
                        </p>
                    )}
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </header>
            <div className="px-4 pb-4">{children}</div>
        </section>
    );
}
