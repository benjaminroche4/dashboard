import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import type { InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import type { SiteSection } from '@/types/auth';

export type BreadcrumbItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
};

/** Poignée d'une icône `lucide-animated` : lance ou arrête son mouvement. */
export type AnimatedNavIconHandle = {
    startAnimation: () => void;
    stopAnimation: () => void;
};

export type AnimatedNavIcon = ForwardRefExoticComponent<
    {
        size?: number;
        animateOnHover?: boolean;
        className?: string;
    } & RefAttributes<AnimatedNavIconHandle>
>;

export type NavItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    /**
     * Icône animée (`lucide-animated`) qui remplace `icon` dans la sidebar :
     * elle joue son mouvement au survol de toute la ligne, pas seulement de
     * l'icône, et se tient tranquille avec `prefers-reduced-motion`.
     */
    animatedIcon?: AnimatedNavIcon | null;
    isActive?: boolean;
    /**
     * Ce qui **attend une action** : point rouge à droite (sans chiffre, le
     * compte reste dans le nom accessible), point sur l'icône en mode icône,
     * et reporté sur l'intitulé du groupe quand il est plié.
     */
    badge?: number;
    /** Simple total, affiché en gris sur une pastille blanche : il n'appelle rien. */
    total?: number;
    /** Raccourci clavier « G puis touche » (ex. `G L`), annoncé dans l'infobulle. */
    shortcut?: string;
    /** Sous-entrées (menu dépliable). */
    items?: NavSubItem[];
    /** Clé de mémorisation de l'état déplié, quand deux menus portent le même titre. */
    key?: string;
    /** Section requise ; absente = toujours visible. */
    section?: SiteSection;
};

export type NavSubItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    /** Compteur affiché à droite du sous-lien. */
    badge?: number;
    /** Section requise ; absente = toujours visible. */
    section?: SiteSection;
    /** Raccourci clavier « G puis touche », comme sur une entrée parente. */
    shortcut?: string;
};

export type NavGroup = {
    /** Vide : le groupe s'affiche sans en-tête. */
    label: string;
    items: NavItem[];
};
