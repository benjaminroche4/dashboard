import type { InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import type { SiteSection } from '@/types/auth';

export type BreadcrumbItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
};

export type NavItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
    /** Compteur affiché à droite (pastille ronde), point discret en mode icône. */
    badge?: number;
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
};

export type NavGroup = {
    /** Vide : le groupe s'affiche sans en-tête. */
    label: string;
    items: NavItem[];
};
