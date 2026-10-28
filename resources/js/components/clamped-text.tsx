import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Au-delà, un texte est replié derrière « Voir plus » (caractères, ou retours à la ligne). */
export const CLAMP_CHARS = 420;
export const CLAMP_LINES = 6;

/** Vrai quand le texte mérite d'être replié : long, ou sur beaucoup de lignes. */
export function needsClamp(text: string, lines = CLAMP_LINES): boolean {
    return text.length > CLAMP_CHARS || text.split('\n').length > lines;
}

/**
 * Un texte long replié sur quelques lignes avec « Voir plus » / « Voir
 * moins » (28 octobre 2026 : les notes de l'équipe peuvent faire des pages,
 * elles ne doivent pas pousser le reste de la fiche hors de l'écran). Le
 * repli est décidé sur le texte, pas mesuré à l'écran, pour rester stable.
 * `children` permet de rendre le texte enrichi (mentions) ; `text` reste la
 * mesure.
 */
export function ClampedText({
    text,
    children,
    lines = CLAMP_LINES,
    className,
    as: Tag = 'p',
}: {
    text: string;
    children?: ReactNode;
    lines?: number;
    className?: string;
    as?: 'p' | 'div' | 'span' | 'blockquote';
}) {
    const [expanded, setExpanded] = useState(false);
    const clamp = needsClamp(text, lines) && !expanded;
    const toggle = needsClamp(text, lines);

    return (
        <Tag
            className={cn('whitespace-pre-line', className)}
            data-clamped={clamp ? 'true' : undefined}
        >
            <span
                className={cn('block', clamp && 'line-clamp-6')}
                style={clamp ? { WebkitLineClamp: lines } : undefined}
            >
                {children ?? text}
            </span>
            {toggle && (
                // Un `span` et non un `button` : le texte peut vivre dans le
                // bouton d'un champ modifiable en place (« Notes libres »),
                // et un bouton dans un bouton n'existe pas en HTML. Le clic
                // ne remonte pas, pour ne pas ouvrir l'éditeur.
                <span
                    role="button"
                    tabIndex={0}
                    aria-expanded={!clamp}
                    onClick={(event) => {
                        event.stopPropagation();
                        setExpanded((value) => !value);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            event.stopPropagation();
                            setExpanded((value) => !value);
                        }
                    }}
                    className="mt-1 inline-block cursor-pointer text-xs font-medium underline-offset-2 hover:underline"
                >
                    {clamp ? 'Voir plus' : 'Voir moins'}
                </span>
            )}
        </Tag>
    );
}
