import { Link } from '@inertiajs/react';
import { PlusIcon, type PlusIconHandle } from 'lucide-animated';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
    /** Destination du bouton (route Wayfinder ou URL). */
    href: Parameters<typeof Link>[0]['href'];
    /** Libellé accessible et infobulle : « Nouveau lead », « Prospecter un propriétaire ». */
    label: string;
    className?: string;
};

/** Vrai quand l'utilisateur demande moins de mouvement : l'icône reste immobile. */
function prefersReducedMotion(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

/**
 * Bouton rond « + » plein qui coiffe une liste (leads locataires et
 * propriétaires, 28 octobre 2026) : le libellé ne se lit qu'en infobulle et
 * pour les lecteurs d'écran. Le « + » est l'icône `lucide-animated`, qui
 * tourne au survol de **tout le bouton** (poignée `startAnimation`, comme les
 * icônes de la sidebar) et jamais avec `prefers-reduced-motion`.
 */
export function CreateButton({ href, label, className }: Props) {
    const handle = useRef<PlusIconHandle>(null);

    return (
        <Button
            asChild
            size="icon"
            className={cn('rounded-full', className)}
            aria-label={label}
            title={label}
        >
            <Link
                href={href}
                onMouseEnter={() => {
                    if (!prefersReducedMotion()) {
                        handle.current?.startAnimation();
                    }
                }}
                onMouseLeave={() => handle.current?.stopAnimation()}
            >
                <PlusIcon
                    ref={handle}
                    size={16}
                    animateOnHover={false}
                    aria-hidden="true"
                    className="inline-flex shrink-0 items-center justify-center [&_svg]:size-4"
                />
            </Link>
        </Button>
    );
}
