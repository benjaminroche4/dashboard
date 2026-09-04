import { Activity, Keyboard, Users, X } from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarProvider,
} from '@/components/ui/sidebar';
import { useInitials } from '@/hooks/use-initials';
import { useOnlineStaff } from '@/hooks/use-online-staff';
import {
    describeEvent,
    useStaffChannel,
    type DashboardUpdatedEvent,
} from '@/hooks/use-staff-channel';

const shortcuts = [
    { keys: '⌘ K', label: 'Rechercher une page' },
    { keys: '⌘ D', label: 'Tableau de bord' },
    { keys: '⌘ ,', label: 'Paramètres' },
    { keys: '⌘ B', label: 'Replier la navigation' },
];

const MAX_ACTIVITY = 20;

function OnlineSection() {
    const members = useOnlineStaff();
    const getInitials = useInitials();

    return (
        <SidebarGroup>
            <SidebarGroupLabel>
                <Users className="mr-2 size-4" />
                En ligne
                <span className="text-muted-foreground ml-auto tabular-nums">
                    {members.length}
                </span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
                {members.length === 0 ? (
                    <p className="text-muted-foreground px-2 py-1.5 text-sm">
                        Personne d'autre pour le moment.
                    </p>
                ) : (
                    <ul role="list" className="space-y-1">
                        {members.map((member) => (
                            <li
                                key={member.id}
                                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                            >
                                <span className="relative">
                                    <Avatar className="size-7 rounded-md">
                                        <AvatarFallback className="rounded-md text-xs">
                                            {getInitials(member.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="ring-sidebar absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-emerald-500 ring-2" />
                                </span>
                                <span className="truncate">{member.name}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

function ActivitySection() {
    const [events, setEvents] = useState<DashboardUpdatedEvent[]>([]);

    // Flux local des événements reçus ; le toast et le rechargement sont
    // déjà gérés par <RealtimeStaff />, on ne fait qu'écouter ici.
    useStaffChannel({
        notify: false,
        reload: false,
        onEvent: (event) =>
            setEvents((current) => [event, ...current].slice(0, MAX_ACTIVITY)),
    });

    return (
        <SidebarGroup>
            <SidebarGroupLabel>
                <Activity className="mr-2 size-4" />
                Activité en direct
            </SidebarGroupLabel>
            <SidebarGroupContent>
                {events.length === 0 ? (
                    <p className="text-muted-foreground px-2 py-1.5 text-sm text-pretty">
                        Les actions des autres membres apparaîtront ici.
                    </p>
                ) : (
                    <ul role="list" className="space-y-2 px-2 py-1">
                        {events.map((event, index) => (
                            <li
                                key={`${event.at}-${index}`}
                                className="animate-in fade-in slide-in-from-top-1 text-sm duration-200"
                            >
                                <p className="text-pretty">
                                    {describeEvent(event)}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    {new Date(event.at).toLocaleTimeString(
                                        'fr-FR',
                                        { hour: '2-digit', minute: '2-digit' },
                                    )}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

function ShortcutsSection() {
    return (
        <SidebarGroup>
            <SidebarGroupLabel>
                <Keyboard className="mr-2 size-4" />
                Raccourcis
            </SidebarGroupLabel>
            <SidebarGroupContent>
                <ul role="list" className="space-y-1">
                    {shortcuts.map((shortcut) => (
                        <li
                            key={shortcut.keys}
                            className="flex items-center justify-between gap-2 px-2 py-1 text-sm"
                        >
                            <span className="text-muted-foreground truncate">
                                {shortcut.label}
                            </span>
                            <kbd className="bg-muted text-muted-foreground rounded border px-1.5 py-0.5 font-mono text-[10px]">
                                {shortcut.keys}
                            </kbd>
                        </li>
                    ))}
                </ul>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

/**
 * Panneau d'informations à droite : membres en ligne, activité en direct,
 * raccourcis. Il a son propre SidebarProvider pour ne pas partager l'état
 * de la navigation de gauche ; l'ouverture est pilotée par le layout.
 */
export function InfoSidebar({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <SidebarProvider
            open={open}
            onOpenChange={onOpenChange}
            className="min-h-0 w-auto flex-none"
        >
            <Sidebar side="right" collapsible="offcanvas" variant="inset">
                <SidebarHeader className="flex-row items-center justify-between px-4 py-3">
                    <p className="text-sm font-medium">Informations</p>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label="Fermer le panneau"
                        onClick={() => onOpenChange(false)}
                    >
                        <X className="size-4" />
                    </Button>
                </SidebarHeader>
                <SidebarContent>
                    <OnlineSection />
                    <ActivitySection />
                    <ShortcutsSection />
                </SidebarContent>
            </Sidebar>
        </SidebarProvider>
    );
}
