import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Pastille « IA » posée sur tout ce qui vient de l'assistant (champs
 * préremplis, proposition de qualification, explication d'une suggestion),
 * pour que l'équipe sache ce qu'elle doit relire.
 */
export function AiBadge({
    label = 'IA',
    className,
}: {
    label?: string;
    className?: string;
}) {
    return (
        <Badge
            variant="secondary"
            aria-label="Proposé par l’assistant IA"
            className={cn(
                'gap-1 bg-violet-50 font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300',
                className,
            )}
        >
            <Sparkles className="size-3" aria-hidden />
            {label}
        </Badge>
    );
}
