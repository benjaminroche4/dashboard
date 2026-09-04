import { Link } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
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
            <SidebarMenuBadge className="bg-sidebar-primary text-sidebar-primary-foreground h-[18px] min-w-[18px] rounded-full px-1">
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

function NavLeaf({ item }: { item: NavItem }) {
    const { isCurrentUrl } = useCurrentUrl();

    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                asChild
                isActive={isCurrentUrl(item.href)}
                tooltip={{ children: item.title }}
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

function NavBranch({ item }: { item: NavItem }) {
    const { isCurrentUrl } = useCurrentUrl();
    const items = item.items ?? [];
    const hasActiveChild = items.some((sub) => isCurrentUrl(sub.href));

    return (
        <Collapsible
            asChild
            defaultOpen={item.isActive || hasActiveChild}
            className="group/collapsible"
        >
            <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                        tooltip={{ children: item.title }}
                        isActive={hasActiveChild}
                    >
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                        <ChevronDown className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <SidebarMenuSub>
                        {items.map((sub) => (
                            <SidebarMenuSubItem key={sub.title}>
                                <SidebarMenuSubButton
                                    asChild
                                    isActive={isCurrentUrl(sub.href)}
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
