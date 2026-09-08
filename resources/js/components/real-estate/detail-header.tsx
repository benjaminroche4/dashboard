import { Link } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import { CreatedBy } from '@/components/created-by';
import { FavoriteButton } from '@/components/favorite-button';
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
    backHref,
    backLabel,
    favorite,
}: {
    name: string;
    /** Étoile de favori personnel : état et route de bascule. */
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
    backHref: string;
    backLabel: string;
}) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-4 pt-8 pb-6">
            <div className="flex min-w-0 items-center gap-4">
                <span
                    aria-hidden
                    className={cn(
                        'flex size-12 shrink-0 items-center justify-center rounded-lg text-sm font-semibold',
                        tone,
                    )}
                >
                    {initials(name)}
                </span>
                <div className="min-w-0">
                    <h1 className="truncate text-lg font-medium">{name}</h1>
                    {subtitle && (
                        <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm">
                            {subtitle}
                        </div>
                    )}
                    <p className="text-muted-foreground pt-1 text-xs">
                        <CreatedBy
                            name={creator}
                            avatar={creatorAvatar}
                            date={createdAt}
                            verb="ajouté(e) par"
                        />
                        {' · '}
                        <Link
                            href={backHref}
                            className="underline-offset-4 hover:underline"
                        >
                            {backLabel}
                        </Link>
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {favorite && (
                    <FavoriteButton
                        favorite={favorite.active}
                        url={favorite.url}
                        name={name}
                        size="md"
                    />
                )}
                <Button variant="outline" onClick={onEdit}>
                    <Pencil />
                    Modifier
                </Button>
                <RealEstateRowActions
                    name={name}
                    deleteUrl={deleteUrl}
                    deleteTitle={deleteTitle}
                    deleteDescription={deleteDescription}
                    onEdit={onEdit}
                />
            </div>
        </div>
    );
}

/** Section nue de la fiche, séparée de la suivante par un filet. */
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
            className="grid gap-3 py-8 first:pt-0 last:pb-0"
        >
            <header className="flex items-center justify-between gap-2">
                <h2 className="text-base font-medium">{title}</h2>
                {action}
            </header>
            {children}
        </section>
    );
}

/** Ligne libellé / valeur des fiches. */
export function DetailRow({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="grid grid-cols-1 gap-0.5 text-sm sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 font-medium [overflow-wrap:anywhere]">
                {children}
            </dd>
        </div>
    );
}

export const missingValue = (
    <span className="text-muted-foreground font-normal">Non renseigné</span>
);
