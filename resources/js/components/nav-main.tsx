import { Link } from '@inertiajs/react';
import { ChevronUp } from 'lucide-react';
import { useState } from 'react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarSeparator,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavGroup, NavItem } from '@/types';

function NavBadge({ value }: { value: NavItem['badge'] }) {
    if (value === undefined || value === null) {
        return null;
    }

    return (
        <>
            <SidebarMenuBadge className="bg-sidebar-primary text-sidebar-primary-foreground peer-hover/menu-button:bg-sidebar-primary-foreground peer-hover/menu-button:text-sidebar-primary peer-data-[active=true]/menu-button:bg-sidebar-primary-foreground peer-data-[active=true]/menu-button:text-sidebar-primary size-5 rounded-full px-0 transition-colors duration-150">
                {value}
            </SidebarMenuBadge>
            {/* Mode icône : le compteur devient un point sur l'icône. */}
            <span
                aria-hidden="true"
                className="bg-sidebar-primary ring-sidebar pointer-events-none absolute top-1.5 right-1.5 hidden size-1.5 rounded-full ring-2 group-data-[collapsible=icon]:block"
            />
        </>
    );
}

// Survol : toute la ligne réagit, fond doux et texte renforcé, sans saut.
const hoverClasses =
    'transition-colors duration-150 ease-out hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent';

function NavLeaf({ item }: { item: NavItem }) {
    const { isCurrentUrl } = useCurrentUrl();

    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                asChild
                isActive={isCurrentUrl(item.href)}
                tooltip={{ children: item.title }}
                className={hoverClasses}
            >
                <Link href={item.href} prefetch>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                </Link>
            </SidebarMenuButton>
            <NavBadge value={item.badge} />
        </SidebarMenuItem>
    );
}

/** Clé de stockage de l'état ouvert/fermé d'un menu dépliable. */
export const branchStorageKey = (title: string) => `sidebar.branch.${title}`;

/** État mémorisé d'un menu dépliable, ou `null` s'il n'a jamais été touché. */
function readBranchOpen(title: string): boolean | null {
    try {
        const stored = localStorage.getItem(branchStorageKey(title));

        return stored === null ? null : stored === '1';
    } catch {
        return null;
    }
}

function writeBranchOpen(title: string, open: boolean): void {
    try {
        localStorage.setItem(branchStorageKey(title), open ? '1' : '0');
    } catch {
        // Stockage indisponible : l'état reste en mémoire.
    }
}

function NavBranch({ item }: { item: NavItem }) {
    const { isCurrentUrl } = useCurrentUrl();
    const items = item.items ?? [];
    const hasActiveChild = items.some((sub) => isCurrentUrl(sub.href));
    const linkable = typeof item.href === 'string' ? item.href !== '#' : true;
    // L'état choisi par l'utilisateur survit au rechargement de la page ;
    // à défaut, le menu s'ouvre si la page courante est un sous-lien.
    const [open, setOpen] = useState(
        () => readBranchOpen(item.title) ?? hasActiveChild,
    );

    const toggle = (next: boolean) => {
        setOpen(next);
        writeBranchOpen(item.title, next);
    };

    return (
        <Collapsible
            asChild
            open={open}
            onOpenChange={toggle}
            className="group/collapsible"
        >
            <SidebarMenuItem>
                {linkable ? (
                    <>
                        {/* Le parent est une vraie page : le libellé y mène, le chevron replie. */}
                        <SidebarMenuButton
                            asChild
                            tooltip={{ children: item.title }}
                            isActive={hasActiveChild}
                            className={hoverClasses}
                        >
                            <Link
                                href={item.href}
                                prefetch
                                onClick={() => {
                                    if (!open) {
                                        toggle(true);
                                    }
                                }}
                            >
                                {item.icon && <item.icon />}
                                <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                        <CollapsibleTrigger asChild>
                            <SidebarMenuAction
                                aria-label={
                                    open
                                        ? `Replier ${item.title}`
                                        : `Déplier ${item.title}`
                                }
                            >
                                <ChevronUp className="rotate-180 transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] group-data-[state=open]/collapsible:rotate-0" />
                            </SidebarMenuAction>
                        </CollapsibleTrigger>
                    </>
                ) : (
                    <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                            tooltip={{ children: item.title }}
                            isActive={hasActiveChild}
                            className={hoverClasses}
                        >
                            {item.icon && <item.icon />}
                            <span>{item.title}</span>
                            {/* Fermé : pointe vers le bas. Ouvert : tourne dans l'autre sens, vers le haut. */}
                            <ChevronUp className="ml-auto rotate-180 transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] group-data-[state=open]/collapsible:rotate-0" />
                        </SidebarMenuButton>
                    </CollapsibleTrigger>
                )}
                <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up overflow-hidden ease-[cubic-bezier(0.4,0,0.2,1)]">
                    <SidebarMenuSub>
                        {items.map((sub, index) => (
                            <SidebarMenuSubItem
                                key={sub.title}
                                // Les sous-liens apparaissent un à un, en fondu avec un léger glissement vertical.
                                className="animate-in fade-in slide-in-from-top-1 fill-mode-backwards duration-200 ease-out"
                                style={{
                                    animationDelay: `${40 + index * 40}ms`,
                                }}
                            >
                                <SidebarMenuSubButton
                                    asChild
                                    isActive={isCurrentUrl(sub.href)}
                                    className={hoverClasses}
                                >
                                    <Link href={sub.href} prefetch>
                                        <span>{sub.title}</span>
                                    </Link>
                                </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        ))}
                    </SidebarMenuSub>
                </CollapsibleContent>
            </SidebarMenuItem>
        </Collapsible>
    );
}

/**
 * Navigation principale : un SidebarGroup par section, avec libellé masqué en
 * mode icône et remplacé par un séparateur entre les groupes.
 */
export function NavMain({ groups }: { groups: NavGroup[] }) {
    return (
        <>
            {groups.map((group, index) => (
                <SidebarGroup key={group.label}>
                    {index > 0 && (
                        <SidebarSeparator className="mx-0 mb-2 hidden w-auto group-data-[collapsible=icon]:block" />
                    )}
                    <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {group.items.map((item) =>
                                item.items?.length ? (
                                    <NavBranch key={item.title} item={item} />
                                ) : (
                                    <NavLeaf key={item.title} item={item} />
                                ),
                            )}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            ))}
        </>
    );
}
