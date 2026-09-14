import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Photo principale d'un bien, en vignette carrée : une silhouette de bâtiment
 * tant qu'aucune photo n'a été déposée, pour que les lignes d'une liste
 * gardent le même alignement. Elle précède toujours les informations du bien —
 * annuaire des biens, fiche d'un propriétaire, fiche d'une agence, dossier
 * client —, un logement se reconnaissant à son image avant son adresse.
 */
export function PropertyThumb({
    photo,
    label,
    className,
}: {
    photo?: string | null;
    label: string;
    className?: string;
}) {
    return photo ? (
        <img
            src={photo}
            alt={`Photo de ${label}`}
            loading="lazy"
            className={cn('size-8 shrink-0 rounded-md object-cover', className)}
        />
    ) : (
        <span
            aria-hidden
            className={cn(
                'bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md',
                className,
            )}
        >
            <Building2 className="size-4" />
        </span>
    );
}
