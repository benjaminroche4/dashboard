import { cn } from '@/lib/utils';

/**
 * Chiffres d'une horloge qui **roulent** quand ils changent, façon machine à
 * sous : chaque caractère est monté à part et, dès qu'il change, le nouveau
 * glisse par le bas dans une fenêtre coupée (`overflow-hidden`). Les
 * caractères inchangés ne bougent pas, les deux-points jamais. Immobile avec
 * `prefers-reduced-motion`.
 */
export function SlotDigits({
    value,
    className,
}: {
    /** L'heure formatée, « 17:48 ». */
    value: string;
    className?: string;
}) {
    return (
        <span className={cn('inline-flex', className)}>
            {/* L'heure est en ASCII (« 17:48 ») : split suffit, sans segmenteur. */}
            {value.split('').map((char, index) => {
                const digit = /\d/.test(char);

                return (
                    <span
                        // Le caractère change : la clé change, le span se
                        // remonte et rejoue l'entrée par le bas.
                        key={`${index}-${char}`}
                        className={cn(
                            'inline-block overflow-hidden',
                            digit && 'min-w-[0.62em] text-center',
                        )}
                    >
                        <span
                            className={cn(
                                'inline-block',
                                digit &&
                                    'animate-slot-in motion-reduce:animate-none',
                            )}
                        >
                            {char}
                        </span>
                    </span>
                );
            })}
        </span>
    );
}
