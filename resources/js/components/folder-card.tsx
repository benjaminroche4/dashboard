import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { RouteDefinition } from '@/wayfinder';

/**
 * Chemise à documents : fermée au repos, des pages en dépassent au survol
 * (maquette Figma « Folder Card », états Default et Hover). Les dessins de
 * la chemise sont les exports Figma dans `public/images/folder`.
 */
function Sheet({
    className,
    faded = false,
}: {
    className?: string;
    /** Page presque blanche, sans étiquette. */
    faded?: boolean;
}) {
    return (
        <div
            className={cn(
                'absolute flex h-[68px] w-[82px] items-start justify-center rounded-[7px] border border-neutral-200 bg-white pt-[13px]',
                className,
            )}
        >
            <div className={cn('relative size-[26px]', faded && 'opacity-10')}>
                <img
                    src="/images/folder/page.svg"
                    alt=""
                    className="absolute inset-y-0 right-[2.5%] left-[17.5%] block h-full w-[80%]"
                />
                {!faded && (
                    <span className="absolute bottom-[14%] left-[2%] rounded-[1.5px] bg-black px-[2px] py-[1px] text-[6.5px] leading-none font-bold text-neutral-50">
                        PDF
                    </span>
                )}
            </div>
        </div>
    );
}

export function FolderIllustration({
    className,
    open = false,
}: {
    className?: string;
    /** Force la chemise ouverte, en plus du survol et du focus. */
    open?: boolean;
}) {
    return (
        <div
            aria-hidden
            className={cn(
                'relative h-[140px] w-[180px] shrink-0 overflow-hidden',
                className,
            )}
        >
            <img
                src="/images/folder/back.svg"
                alt=""
                className="absolute top-0 left-0 block h-[127px] w-[180px] max-w-none"
            />
            <div
                data-open={open ? '' : undefined}
                className="absolute inset-0 translate-y-12 transition-transform duration-300 ease-out group-focus-within:translate-y-0 group-hover:translate-y-0 data-open:translate-y-0 motion-reduce:transition-none"
            >
                <Sheet className="top-[8px] left-[8px] -rotate-[7deg]" />
                <Sheet
                    className="top-[28px] left-[90px] rotate-[13deg]"
                    faded
                />
                <Sheet className="top-[14px] left-[65px] rotate-[6deg] shadow-[0_-1px_5px_rgba(0,0,0,0.15)]" />
            </div>
            <img
                src="/images/folder/front.svg"
                alt=""
                className="absolute top-[23px] left-[-7px] block h-[121px] w-[194px] max-w-none"
            />
        </div>
    );
}

type Props = {
    title: string;
    /** Ligne grise sous le titre (« 10 fichiers », société, référence). */
    subtitle?: string | null;
    /**
     * Destination : un objet de route Wayfinder (visite Inertia) ou une
     * ancre `#section` de la page. La carte entière est cliquable ; les
     * liens placés dans `children` restent utilisables.
     */
    href?: RouteDefinition<'get'> | string;
    /** Informations complémentaires, sous le titre. */
    children?: ReactNode;
    /** Chemise ouverte même sans survol (ex. ligne survolée dans un tableau). */
    open?: boolean;
    className?: string;
};

export function FolderCard({
    title,
    subtitle,
    href,
    children,
    open = false,
    className,
}: Props) {
    const heading =
        href === undefined ? (
            <span className="text-base font-medium">{title}</span>
        ) : typeof href === 'string' ? (
            <a
                href={href}
                className="text-base font-medium after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none"
            >
                {title}
            </a>
        ) : (
            <Link
                href={href}
                prefetch
                className="text-base font-medium after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none"
            >
                {title}
            </Link>
        );

    return (
        <article
            data-open={open ? '' : undefined}
            className={cn(
                'group bg-sidebar hover:bg-muted focus-within:bg-muted data-open:bg-muted has-[a:focus-visible]:ring-ring/50 relative flex flex-col items-center gap-3 rounded-2xl border px-6 pt-6 pb-4 transition-colors has-[a:focus-visible]:ring-[3px]',
                className,
            )}
        >
            <FolderIllustration open={open} />
            <div className="grid w-full justify-items-center gap-0.5 text-center">
                {heading}
                {subtitle && (
                    <span className="text-muted-foreground truncate text-xs">
                        {subtitle}
                    </span>
                )}
            </div>
            {children && (
                <div className="relative z-10 grid w-full gap-1.5 text-sm">
                    {children}
                </div>
            )}
        </article>
    );
}
