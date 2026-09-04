import { Link, usePage } from '@inertiajs/react';
import {
    Check,
    ChevronsUpDown,
    LayoutGrid,
    Plus,
    Settings,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useWorkspaceShortcuts } from '@/hooks/use-workspace-shortcuts';
import { dashboard } from '@/routes';
import { edit as editProfile } from '@/routes/profile';

/**
 * Menu de l'espace de travail (en-tête de la sidebar).
 * Un seul espace pour l'instant : l'entrée « Ajouter un espace » est désactivée.
 */
export function WorkspaceSwitcher() {
    const { name } = usePage().props;
    const { state } = useSidebar();
    const isMobile = useIsMobile();

    useWorkspaceShortcuts();

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                            data-test="workspace-switcher"
                        >
                            <img
                                src="/images/logo.jpg"
                                alt=""
                                className="size-7 shrink-0 rounded-md"
                            />
                            <div className="ml-1 grid flex-1 text-left text-sm">
                                <span className="mb-0.5 truncate leading-tight font-semibold">
                                    {name}
                                </span>
                            </div>
                            <ChevronsUpDown className="text-muted-foreground size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl"
                        align="start"
                        side={
                            isMobile
                                ? 'bottom'
                                : state === 'collapsed'
                                  ? 'right'
                                  : 'bottom'
                        }
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="text-muted-foreground text-xs">
                            Espace de travail
                        </DropdownMenuLabel>
                        <DropdownMenuItem className="gap-2 p-2" disabled>
                            <img
                                src="/images/logo.jpg"
                                alt=""
                                className="size-6 rounded-sm"
                            />
                            <span className="flex-1 truncate font-medium">
                                {name}
                            </span>
                            <Check className="size-4" />
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem asChild>
                                <Link
                                    href={dashboard()}
                                    prefetch
                                    className="w-full cursor-pointer"
                                >
                                    <LayoutGrid className="mr-2" />
                                    Tableau de bord
                                    <DropdownMenuShortcut>
                                        ⌘D
                                    </DropdownMenuShortcut>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link
                                    href={editProfile()}
                                    prefetch
                                    className="w-full cursor-pointer"
                                >
                                    <Settings className="mr-2" />
                                    Paramètres
                                    <DropdownMenuShortcut>
                                        ⌘,
                                    </DropdownMenuShortcut>
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled className="gap-2 p-2">
                            <div className="bg-background flex size-6 items-center justify-center rounded-md border">
                                <Plus className="size-4" />
                            </div>
                            <span className="text-muted-foreground font-medium">
                                Ajouter un espace
                            </span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
