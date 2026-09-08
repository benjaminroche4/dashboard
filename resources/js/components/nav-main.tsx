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
import { activeHref } from '@/lib/nav-active';
import { toUrl } from '@/lib/utils';
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

function NavLeaf({
    item,
    activeUrl,
}: {
    item: NavItem;
    /** Lien actif de toute la navigation (voir `NavMain`). */
    activeUrl: string | null;
}) {
    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                asChild
                isActive={toUrl(item.href) === activeUrl}
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

function NavBranch({
    item,
    activeUrl,
}: {
    item: NavItem;
    activeUrl: string | null;
}) {
    const items = item.items ?? [];
    // Le sous-lien actif est celui qui porte la sélection globale.
    const activeSub =
        activeUrl !== null && items.some((sub) => toUrl(sub.href) === activeUrl)
            ? activeUrl
            : null;
    const hasActiveChild = activeSub !== null || toUrl(item.href) === activeUrl;
    const linkable = typeof item.href === 'string' ? item.href !== '#' : true;
    // L'état choisi par l'utilisateur survit au rechargement de la page ;
    // à défaut, le menu s'ouvre si la page courante est un sous-lien.
    const storageKey = item.key ?? item.title;
    const [open, setOpen] = useState(
        () => readBranchOpen(storageKey) ?? hasActiveChild,
    );

    const toggle = (next: boolean) => {
        setOpen(next);
        writeBranchOpen(storageKey, next);
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
                                    isActive={toUrl(sub.href) === activeSub}
                                    className={hoverClasses}
                                >
                                    <Link href={sub.href} prefetch>
                                        <span>{sub.title}</span>
                                        {/* Compteur dans le flux du lien (pas en absolu : le sous-lien n'a pas de repère `peer`), hors nom accessible comme pour les entrées parentes. */}
                                        {sub.badge !== undefined &&
                                            sub.badge > 0 && (
                                                <span
                                                    aria-hidden="true"
                                                    data-sidebar="menu-badge"
                                                    className="bg-sidebar-primary text-sidebar-primary-foreground ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-xs font-medium tabular-nums"
                                                >
                                                    {sub.badge}
                                                </span>
                                            )}
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

/** Tous les liens de la navigation, parents et sous-liens confondus. */
function collectHrefs(groups: NavGroup[]): string[] {
    return groups.flatMap((group) =>
        group.items.flatMap((item) => [
            toUrl(item.href),
            ...(item.items ?? []).map((sub) => toUrl(sub.href)),
        ]),
    );
}

/**
 * Navigation principale : un SidebarGroup par section, avec libellé masqué en
 * mode icône et remplacé par un séparateur entre les groupes.
 *
 * Un seul lien est actif à la fois : le plus précis de toute la navigation.
 * Ainsi /tools/reports sélectionne « Rapports » sans allumer « Outils »
 * (/tools), et /locataires/create « Converting Machine » sans « Leads locataires ».
 */
export function NavMain({ groups }: { groups: NavGroup[] }) {
    const { currentUrl } = useCurrentUrl();
    const activeUrl = activeHref(collectHrefs(groups), currentUrl);

    return (
        <>
            {groups.map((group, index) => (
                <SidebarGroup key={group.label || `group-${index}`}>
                    {index > 0 && (
                        <SidebarSeparator className="mx-0 mb-2 hidden w-auto group-data-[collapsible=icon]:block" />
                    )}
                    {/* Un groupe sans libellé (ex. « Tableau de bord » seul en tête) n'affiche pas d'en-tête. */}
                    {group.label !== '' && (
                        <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                    )}
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {group.items.map((item) =>
                                item.items?.length ? (
                                    <NavBranch
                                        key={item.title}
                                        item={item}
                                        activeUrl={activeUrl}
                                    />
                                ) : (
                                    <NavLeaf
                                        key={item.title}
                                        item={item}
                                        activeUrl={activeUrl}
                                    />
                                ),
                            )}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            ))}
        </>
    );
}
