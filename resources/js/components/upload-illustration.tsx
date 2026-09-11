import { CirclePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Illustration de dépôt de fichiers (maquette Figma « DD content type ») :
 * deux feuilles inclinées portant leur format, et une carte centrale avec un
 * plus. Le dessin de la feuille est l'export Figma `public/images/upload`.
 */
function Sheet({
    label,
    className,
}: {
    /** Format imprimé sur la feuille, « JPG », « PNG »… */
    label: string;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'absolute flex size-[79px] flex-col items-center justify-center rounded-[6.6px] border-[1.65px] border-white bg-[linear-gradient(180deg,#E6E7E8_62%,#FFFFFF_100%)] shadow-[0_2.6px_10.6px_0_rgba(0,0,0,0.1)]',
                className,
            )}
        >
            <div className="relative size-[32px]">
                <img
                    src="/images/upload/page.svg"
                    alt=""
                    className="absolute inset-y-0 right-[10%] left-[10%] block h-full w-[80%]"
                />
                <span className="absolute inset-x-[10%] bottom-[15%] text-center text-[6px] leading-none font-bold text-[#414651]">
                    {label}
                </span>
            </div>
        </div>
    );
}

export function UploadIllustration({
    labels = ['JPG', 'PNG'],
    className,
}: {
    /** Formats imprimés sur les deux feuilles. */
    labels?: [string, string];
    className?: string;
}) {
    return (
        <div
            aria-hidden
            className={cn('relative h-[115px] w-[183px]', className)}
        >
            <Sheet
                label={labels[0]}
                className="top-[19px] left-[11px] -rotate-10"
            />
            <Sheet
                label={labels[1]}
                className="top-[19px] left-[90px] rotate-10"
            />
            <div className="absolute top-[9px] left-[45px] flex size-[88px] items-center justify-center rounded-[7.3px] border-[1.8px] border-white bg-[linear-gradient(180deg,#E6E7E8_19%,#FFFFFF_100%)] shadow-[0_2.9px_11.7px_0_rgba(0,0,0,0.16)]">
                <CirclePlus className="size-[29px] text-[#414651] opacity-80" />
            </div>
        </div>
    );
}
