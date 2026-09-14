import { cn } from '@/lib/utils';

/**
 * Chemise à documents : fermée au repos, des pages en dépassent au survol
 * (maquette Figma « Folder Card », états Default et Hover). Les dessins de
 * la chemise sont les exports Figma dans `public/images/folder`. Seule
 * l'illustration sert : la liste des dossiers et l'en-tête d'un dossier la
 * posent à côté du nom.
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
