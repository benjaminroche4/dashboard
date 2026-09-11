import { Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import { CreatedBy } from '@/components/created-by';
import { FavoriteStar } from '@/components/favorite-star';
import { RealEstateRowActions } from '@/components/real-estate/real-estate-row-actions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Initiales d'un nom (deux lettres au plus). */
function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() ?? '')
        .join('');
}

/**
 * En-tête commun des fiches agent et agence : pastille d'initiales, nom,
 * sous-titre, auteur, bouton Modifier et menu « ⋯ ».
 */
export function DetailHeader({
    name,
    subtitle,
    creator,
    creatorAvatar,
    createdAt,
    onEdit,
    deleteUrl,
    deleteTitle,
    deleteDescription,
    tone = 'bg-primary/10 text-primary',
    favorite,
    actions,
    children,
}: {
    name: string;
    /** Favori personnel : étoile à côté du nom, bascule dans le menu « ⋯ ». */
    favorite?: { active: boolean; url: string };
    subtitle?: ReactNode;
    creator: string | null;
    creatorAvatar: string | null;
    createdAt: string | null;
    onEdit: () => void;
    deleteUrl: string;
    deleteTitle: string;
    deleteDescription: string;
    tone?: string;
    /** Boutons propres à la fiche, posés avant « Modifier ». */
    actions?: ReactNode;
    /** Bloc posé sous le titre, dans le même panneau (coordonnées, chiffres clés…). */
    children?: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-4 pt-8 pb-6">
            <p className="text-muted-foreground text-xs">
                <CreatedBy
                    name={creator}
                    avatar={creatorAvatar}
                    date={createdAt}
                    verb="Ajouté(e) par"
                />
            </p>
            <div className="bg-muted/40 grid gap-4 rounded-xl border p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <span
                        aria-hidden
                        className={cn(
                            'flex size-11 shrink-0 items-center justify-center rounded-lg text-sm font-semibold',
                            tone,
                        )}
                    >
                        {initials(name)}
                    </span>
                    <div className="min-w-0 flex-1">
                        {/* L'étoile reste hors du titre : le nom accessible du <h1>
                        ne doit pas se terminer par « Favori ». */}
                        <div className="flex items-center gap-1.5">
                            <h1 className="truncate text-base font-semibold">
                                {name}
                            </h1>
                            {favorite && (
                                <FavoriteStar favorite={favorite.active} />
                            )}
                        </div>
                        {subtitle && (
                            <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm">
                                {subtitle}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {actions}
                        <Button variant="outline" onClick={onEdit}>
                            <Pencil />
                            Modifier
                        </Button>
                        <RealEstateRowActions
                            favorite={favorite}
                            name={name}
                            deleteUrl={deleteUrl}
                            deleteTitle={deleteTitle}
                            deleteDescription={deleteDescription}
                            onEdit={onEdit}
                        />
                    </div>
                </div>
                {/* Coordonnées ou chiffres clés, sous un filet, dans le même panneau. */}
                {children && <div className="border-t pt-4">{children}</div>}
            </div>
        </div>
    );
}

/** Carte de section d'une fiche : intitulé en capitales puis contenu. */
export function DetailSection({
    title,
    action,
    children,
}: {
    title: string;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section
            aria-label={title}
            className="bg-card grid gap-3 rounded-xl border p-4"
        >
            <header className="flex items-center justify-between gap-2 border-b pb-3">
                <h2 className="text-muted-foreground text-xs tracking-wide uppercase">
                    {title}
                </h2>
                {action}
            </header>
            {children}
        </section>
    );
}

/** Couple libellé / valeur des fiches : libellé discret au-dessus de la valeur. */
export function DetailRow({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="grid min-w-0 gap-1">
            <dt className="text-muted-foreground text-sm">{label}</dt>
            <dd className="min-w-0 font-medium [overflow-wrap:anywhere]">
                {children}
            </dd>
        </div>
    );
}

export const missingValue = (
    <span className="text-muted-foreground font-normal">Non renseigné</span>
);
