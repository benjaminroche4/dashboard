import { Link, router } from '@inertiajs/react';
import { ChevronUp, Plus } from 'lucide-react';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
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
    useSidebar,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { activeHref } from '@/lib/nav-active';
import { cn, toUrl } from '@/lib/utils';
import type { AnimatedNavIconHandle, NavGroup, NavItem } from '@/types';

function NavBadge({
    value,
    tone = 'alert',
    yieldsOnHover = false,
}: {
    value: number | undefined;
    /** `alert` : ce qui attend une action, pastille colorée. `total` : un simple compte, en gris. */
    tone?: 'alert' | 'total';
    /** Un bouton « + » prend la place au survol : la pastille s'efface. */
    yieldsOnHover?: boolean;
}) {
    // Un zéro n'apprend rien : le compteur n'apparaît qu'à partir de 1, comme
    // sur les sous-entrées.
    if (value === undefined || value === null || value <= 0) {
        return null;
    }

    return (
        <>
            {/* Même pastille que les sous-entrées, et rien qui bouge au survol
                ni sur le lien actif. Un total se lit en gris : il n'alerte pas. */}
            <SidebarMenuBadge
                data-tone={tone}
                className={cn(
                    'rounded-full transition-opacity',
                    tone === 'alert'
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground peer-hover/menu-button:text-sidebar-primary-foreground peer-data-[active=true]/menu-button:text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground/60 peer-hover/menu-button:text-sidebar-foreground/60 peer-data-[active=true]/menu-button:text-sidebar-foreground/60 bg-transparent font-normal',
                    yieldsOnHover &&
                        'group-focus-within/menu-item:opacity-0 group-hover/menu-item:opacity-0',
                )}
            >
                {value}
            </SidebarMenuBadge>
            {/* Mode icône : seule une alerte devient un point sur l'icône. */}
            {tone === 'alert' && (
                <span
                    aria-hidden="true"
                    className="bg-sidebar-primary ring-sidebar pointer-events-none absolute top-1.5 right-1.5 hidden size-1.5 rounded-full ring-2 group-data-[collapsible=icon]:block"
                />
            )}
        </>
    );
}

/** Bouton « + » d'une entrée, révélé au survol : un formulaire sans passer par la liste. */
function NavCreateAction({
    create,
}: {
    create: NonNullable<NavItem['create']>;
}) {
    return (
        <SidebarMenuAction asChild showOnHover className="rounded-full">
            <Link href={create.href} prefetch aria-label={create.label}>
                <Plus aria-hidden="true" />
            </Link>
        </SidebarMenuAction>
    );
}

/** Infobulle du mode icône : le titre, puis ce qui attend, puis le raccourci. */
function tooltipFor(item: NavItem): string {
    return [
        item.title,
        item.badge ? `${item.badge} en attente` : null,
        item.shortcut ?? null,
    ]
        .filter(Boolean)
        .join(' · ');
}

// Survol : toute la ligne réagit, fond doux et texte renforcé, sans saut.
const hoverClasses =
    'transition-colors duration-150 ease-out hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent';

/** Durée du mouvement joué une fois à l'arrivée sur la page. */
const ARRIVAL_MS = 900;

/** Vrai quand l'utilisateur demande moins de mouvement : l'icône reste immobile. */
function prefersReducedMotion(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

/**
 * Icône d'une entrée du menu. Avec `animatedIcon`, le mouvement part au
 * survol de toute la ligne (via la poignée `startAnimation`), pas seulement de
 * l'icône : la ligne est la cible du clic, c'est elle qui doit répondre.
 *
 * Les `hoverProps` se posent sur le `SidebarMenuItem` (le `li`), **jamais sur
 * le `Link`** : avec `prefetch`, le Link d'Inertia pose ses propres
 * `onMouseEnter` / `onMouseLeave` par-dessus les nôtres, et l'icône ne
 * bougeait plus.
 */
function useNavIcon(item: NavItem, active = false) {
    const handle = useRef<AnimatedNavIconHandle>(null);
    const Animated = item.animatedIcon;

    // À l'arrivée sur la page, l'icône joue une fois : le clic et la
    // destination se répondent. C'est un changement d'état, pas un survol.
    useEffect(() => {
        if (!active || !Animated || prefersReducedMotion()) {
            return;
        }

        handle.current?.startAnimation();
        const timer = window.setTimeout(
            () => handle.current?.stopAnimation(),
            ARRIVAL_MS,
        );

        return () => window.clearTimeout(timer);
    }, [active, Animated]);

    const icon = Animated ? (
        <Animated
            ref={handle}
            size={16}
            animateOnHover={false}
            aria-hidden="true"
            className="inline-flex shrink-0 items-center justify-center [&_svg]:size-4"
        />
    ) : item.icon ? (
        <item.icon />
    ) : null;

    const hoverProps = Animated
        ? {
              onMouseEnter: () => {
                  if (!prefersReducedMotion()) {
                      handle.current?.startAnimation();
                  }
              },
              onMouseLeave: () => handle.current?.stopAnimation(),
          }
        : {};

    return { icon, hoverProps };
}

function NavLeaf({
    item,
    activeUrl,
    className,
    style,
}: {
    item: NavItem;
    /** Lien actif de toute la navigation (voir `NavMain`). */
    activeUrl: string | null;
    /** Entrée en cascade posée par le groupe. */
    className?: string;
    style?: CSSProperties;
}) {
    const active = toUrl(item.href) === activeUrl;
    const { icon, hoverProps } = useNavIcon(item, active);

    return (
        <SidebarMenuItem className={className} style={style} {...hoverProps}>
            <SidebarMenuButton
                asChild
                isActive={active}
                tooltip={tooltipFor(item)}
                className={hoverClasses}
            >
                <Link href={item.href} prefetch>
                    {icon}
                    <span>{item.title}</span>
                </Link>
            </SidebarMenuButton>
            {item.badge ? (
                <NavBadge value={item.badge} yieldsOnHover={!!item.create} />
            ) : (
                <NavBadge
                    value={item.total}
                    tone="total"
                    yieldsOnHover={!!item.create}
                />
            )}
            {item.create && <NavCreateAction create={item.create} />}
        </SidebarMenuItem>
    );
}

/** Clé de stockage de l'état ouvert/fermé d'un menu dépliable. */
export const branchStorageKey = (title: string) => `sidebar.branch.${title}`;

/** Clé de stockage de l'état ouvert/fermé d'un groupe du menu (« Annuaire », « Outils »…). */
export const groupStorageKey = (label: string) => `sidebar.group.${label}`;

/** État mémorisé sous une clé, ou `null` s'il n'a jamais été touché. */
function readStoredOpen(key: string): boolean | null {
    try {
        const stored = localStorage.getItem(key);

        return stored === null ? null : stored === '1';
    } catch {
        return null;
    }
}

function writeStoredOpen(key: string, open: boolean): void {
    try {
        localStorage.setItem(key, open ? '1' : '0');
    } catch {
        // Stockage indisponible : l'état reste en mémoire.
    }
}

const readBranchOpen = (title: string) =>
    readStoredOpen(branchStorageKey(title));
const writeBranchOpen = (title: string, open: boolean) =>
    writeStoredOpen(branchStorageKey(title), open);

/** Entrée en cascade : fondu et léger glissement, décalés d'une ligne à l'autre. */
const cascadeClass =
    'animate-in fade-in slide-in-from-top-1 fill-mode-backwards duration-200 ease-out motion-reduce:animate-none';
const cascadeDelay = (index: number) => ({
    animationDelay: `${40 + index * 40}ms`,
});

function NavBranch({
    item,
    activeUrl,
    className,
    style,
}: {
    item: NavItem;
    activeUrl: string | null;
    className?: string;
    style?: CSSProperties;
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
    const { icon, hoverProps } = useNavIcon(item, hasActiveChild);

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
            <SidebarMenuItem
                className={className}
                style={style}
                {...hoverProps}
            >
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
                                {icon}
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
                            {icon}
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
                                className={cascadeClass}
                                style={cascadeDelay(index)}
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
 * Un groupe du menu. Avec un libellé, il se plie et se déplie d'un clic sur
 * l'intitulé ; l'état survit au rechargement (`sidebar.group.<libellé>`) et
 * **ne se rouvre pas tout seul**, même si la page courante est dedans. Les
 * liens arrivent en cascade à l'ouverture. En mode icône, le libellé n'existe
 * plus : les liens sont toujours montrés, sans toucher à l'état mémorisé.
 */
function NavGroupSection({
    group,
    index,
    activeUrl,
}: {
    group: NavGroup;
    index: number;
    activeUrl: string | null;
}) {
    const { state } = useSidebar();
    const [open, setOpen] = useState(
        () => readStoredOpen(groupStorageKey(group.label)) ?? true,
    );
    const toggle = (next: boolean) => {
        setOpen(next);
        writeStoredOpen(groupStorageKey(group.label), next);
    };
    const labelled = group.label !== '';
    const shown = !labelled || open || state === 'collapsed';
    // Plié, le groupe garde deux repères : la somme de ce qui attend dans ses
    // entrées, et un filet quand la page courante est dedans.
    const pending = group.items.reduce(
        (sum, item) => sum + (item.badge ?? 0),
        0,
    );
    const holdsActive = group.items.some(
        (item) =>
            toUrl(item.href) === activeUrl ||
            (item.items ?? []).some((sub) => toUrl(sub.href) === activeUrl),
    );

    const items = (
        <SidebarGroupContent>
            <SidebarMenu>
                {group.items.map((item, position) => {
                    const Entry = item.items?.length ? NavBranch : NavLeaf;

                    return (
                        <Entry
                            key={item.title}
                            item={item}
                            activeUrl={activeUrl}
                            className={labelled ? cascadeClass : undefined}
                            style={
                                labelled ? cascadeDelay(position) : undefined
                            }
                        />
                    );
                })}
            </SidebarMenu>
        </SidebarGroupContent>
    );

    return (
        <SidebarGroup>
            {index > 0 && (
                <SidebarSeparator className="mx-0 mb-2 hidden w-auto group-data-[collapsible=icon]:block" />
            )}
            {/* Un groupe sans libellé (« Aujourd'hui » seul en tête) n'affiche pas d'en-tête et ne se plie pas. */}
            {labelled ? (
                <Collapsible open={shown} onOpenChange={toggle}>
                    <CollapsibleTrigger asChild>
                        <SidebarGroupLabel
                            asChild
                            className={cn(
                                'hover:bg-sidebar-accent/70 hover:text-sidebar-foreground group/group-label relative w-full cursor-pointer justify-between transition-colors [&>svg]:size-3',
                                // Filet discret : la page courante est dans ce groupe plié.
                                !open &&
                                    holdsActive &&
                                    'before:bg-sidebar-primary before:absolute before:top-2 before:bottom-2 before:left-0 before:w-0.5 before:rounded-full',
                            )}
                        >
                            <button
                                type="button"
                                aria-expanded={shown}
                                aria-label={`${open ? 'Replier' : 'Déplier'} ${group.label}`}
                                data-active={
                                    !open && holdsActive ? 'true' : undefined
                                }
                            >
                                <span className="flex items-center gap-2">
                                    {group.label}
                                    {!open && pending > 0 && (
                                        <span
                                            aria-label={`${pending} en attente`}
                                            data-sidebar="group-badge"
                                            className="bg-sidebar-primary text-sidebar-primary-foreground flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium tabular-nums"
                                        >
                                            {pending}
                                        </span>
                                    )}
                                </span>
                                {/* Flèche discrète : à peine visible au repos, révélée
                                    au survol de l'intitulé ; elle reste lisible quand le
                                    groupe est plié, pour dire qu'il y a quelque chose dessous. */}
                                <ChevronUp
                                    aria-hidden="true"
                                    className={cn(
                                        'text-sidebar-foreground/40 group-hover/group-label:text-sidebar-foreground/70 transition-[transform,color,opacity] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',
                                        open
                                            ? 'rotate-0 opacity-0 group-hover/group-label:opacity-100 group-focus-visible/group-label:opacity-100'
                                            : 'rotate-180 opacity-100',
                                    )}
                                />
                            </button>
                        </SidebarGroupLabel>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up overflow-hidden ease-[cubic-bezier(0.4,0,0.2,1)]">
                        {items}
                    </CollapsibleContent>
                </Collapsible>
            ) : (
                items
            )}
        </SidebarGroup>
    );
}

/** Délai pour frapper la seconde touche après « G ». */
const SHORTCUT_WINDOW_MS = 1500;

/** Vrai si la frappe appartient à un champ de saisie ou à une modale : on n'y vole pas les lettres. */
function typingSomewhere(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement | null;

    if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
    ) {
        return true;
    }

    return (
        document.querySelector('[role="dialog"][data-state="open"]') !== null
    );
}

/**
 * Raccourcis « G puis touche » (`NavItem.shortcut`, ex. `G L`) : la première
 * ouvre une fenêtre d'une seconde et demie, la seconde navigue. Rien ne se
 * passe dans un champ, une modale, ou avec une touche de modification.
 */
export function useNavShortcuts(groups: NavGroup[]): void {
    useEffect(() => {
        const targets = new Map<string, string>();
        for (const group of groups) {
            for (const item of group.items) {
                const key = item.shortcut?.split(' ')[1]?.toLowerCase();
                if (key) {
                    targets.set(key, toUrl(item.href));
                }
            }
        }

        let armedUntil = 0;

        const onKeyDown = (event: KeyboardEvent) => {
            if (
                event.metaKey ||
                event.ctrlKey ||
                event.altKey ||
                typingSomewhere(event)
            ) {
                return;
            }

            const key = event.key.toLowerCase();
            const now = Date.now();

            if (key === 'g') {
                armedUntil = now + SHORTCUT_WINDOW_MS;

                return;
            }

            if (now > armedUntil) {
                return;
            }

            armedUntil = 0;
            const url = targets.get(key);

            if (url) {
                event.preventDefault();
                router.visit(url);
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [groups]);
}

export function NavMain({ groups }: { groups: NavGroup[] }) {
    const { currentUrl } = useCurrentUrl();
    const activeUrl = activeHref(collectHrefs(groups), currentUrl);
    useNavShortcuts(groups);

    return (
        <>
            {groups.map((group, index) => (
                <NavGroupSection
                    key={group.label || `group-${index}`}
                    group={group}
                    index={index}
                    activeUrl={activeUrl}
                />
            ))}
        </>
    );
}
