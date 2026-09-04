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
    /** Compteur affiché à droite (pastille pleine), point discret en mode icône. */
    badge?: string | number;
    /** Sous-entrées (menu dépliable). */
    items?: NavSubItem[];
    /** Lien externe ouvert dans un nouvel onglet. */
    external?: boolean;
};

export type NavSubItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
};

export type NavGroup = {
    label: string;
    items: NavItem[];
};
