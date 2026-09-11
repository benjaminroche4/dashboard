import { Building2, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OwnerKind } from '@/types';

/** Teinte par type de propriétaire, sur le modèle des types de partenaire. */
export const ownerKindTones: Record<OwnerKind, string> = {
    individual: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    company:
        'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
};

const icons = { individual: UserRound, company: Building2 };

/** Particulier ou société : badge teinté, pour les distinguer d'un coup d'œil. */
export function OwnerKindBadge({
    kind,
    label,
    className,
}: {
    kind: OwnerKind;
    label: string;
    className?: string;
}) {
    const Icon = icons[kind];

    return (
        <Badge
            variant="secondary"
            className={cn('gap-1 font-medium', ownerKindTones[kind], className)}
        >
            <Icon className="size-3.5" aria-hidden />
            {label}
        </Badge>
    );
}
