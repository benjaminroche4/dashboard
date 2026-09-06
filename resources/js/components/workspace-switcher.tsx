import { Check, ChevronsUpDown, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
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

/** Espace de travail actif. */
export const CURRENT_WORKSPACE = 'Relocation In Paris';

/** Espaces annoncés mais pas encore ouverts : affichés verrouillés. */
export const UPCOMING_WORKSPACES = [
    { name: 'Estate in Paris', logo: '/images/estate-in-paris.svg' },
] as const;

/**
 * Menu de l'espace de travail (en-tête de la sidebar).
 * Un seul espace ouvert pour l'instant ; les suivants sont listés verrouillés.
 */
export function WorkspaceSwitcher() {
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
                                    {CURRENT_WORKSPACE}
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
                                {CURRENT_WORKSPACE}
                            </span>
                            <Check className="size-4" />
                        </DropdownMenuItem>
                        {UPCOMING_WORKSPACES.map((workspace) => (
                            <DropdownMenuItem
                                key={workspace.name}
                                className="gap-2 p-2"
                                disabled
                            >
                                {/* Logo sombre sur fond blanc : lisible dans les deux thèmes. */}
                                <div className="flex size-6 items-center justify-center rounded-sm border bg-white p-0.5">
                                    <img
                                        src={workspace.logo}
                                        alt=""
                                        className="max-h-full max-w-full"
                                    />
                                </div>
                                <span className="text-muted-foreground flex-1 truncate font-medium">
                                    {workspace.name}
                                </span>
                                <Lock className="text-muted-foreground size-3.5" />
                                <Badge variant="secondary">Bientôt</Badge>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
