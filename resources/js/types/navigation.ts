import type { InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';

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
};

export type NavSubItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    /** Compteur affiché à droite du sous-lien. */
    badge?: number;
};

export type NavGroup = {
    label: string;
    items: NavItem[];
};
