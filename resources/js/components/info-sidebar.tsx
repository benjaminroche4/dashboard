import { usePage } from '@inertiajs/react';
import { Activity, Keyboard, Users } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import { staffRoleLabels } from '@/types/auth';
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

function Section({
    icon: Icon,
    title,
    aside,
    children,
}: {
    icon: typeof Users;
    title: string;
    aside?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="flex flex-col gap-1 px-2 py-3">
            <h2 className="text-sidebar-foreground/70 flex h-8 items-center px-2 text-xs font-medium">
                <Icon className="mr-2 size-4" />
                {title}
                {aside}
            </h2>
            {children}
        </section>
    );
}

function OnlineSection() {
    const online = useOnlineStaff();
    const { staff, auth } = usePage().props;
    const getInitials = useInitials();
    const onlineIds = new Set(online.map((member) => member.id));

    // Annuaire complet, connectés d'abord, puis par nom.
    const members = [...staff].sort((a, b) => {
        const delta = Number(onlineIds.has(b.id)) - Number(onlineIds.has(a.id));

        return delta !== 0 ? delta : a.name.localeCompare(b.name, 'fr');
    });

    return (
        <Section
            icon={Users}
            title="Membres"
            aside={
                <span className="text-muted-foreground ml-auto tabular-nums">
                    {onlineIds.size} / {members.length} en ligne
                </span>
            }
        >
            {members.length === 0 ? (
                <p className="text-muted-foreground px-2 py-1.5 text-sm">
                    Aucun membre.
                </p>
            ) : (
                <ul role="list" className="space-y-1">
                    {members.map((member) => {
                        const isOnline = onlineIds.has(member.id);

                        return (
                            <li
                                key={member.id}
                                className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex h-9 items-center gap-2 rounded-md px-2 text-sm transition-colors"
                                data-online={isOnline}
                            >
                                <span className="relative">
                                    <Avatar className="size-7 rounded-md">
                                        <AvatarFallback className="rounded-md text-xs">
                                            {getInitials(member.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span
                                        role="img"
                                        aria-label={
                                            isOnline ? 'En ligne' : 'Hors ligne'
                                        }
                                        className={cn(
                                            'ring-sidebar absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2',
                                            isOnline
                                                ? 'bg-emerald-500'
                                                : 'bg-neutral-400',
                                        )}
                                    />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate">
                                        {member.name}
                                        {member.id === auth.user.id && (
                                            <span className="text-muted-foreground">
                                                {' '}
                                                (vous)
                                            </span>
                                        )}
                                    </span>
                                    <span className="text-muted-foreground block truncate text-xs">
                                        {staffRoleLabels[member.role]}
                                    </span>
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </Section>
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
        <Section icon={Activity} title="Activité en direct">
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
        </Section>
    );
}

function ShortcutsSection() {
    return (
        <Section icon={Keyboard} title="Raccourcis">
            <ul role="list" className="space-y-1">
                {shortcuts.map((shortcut) => (
                    <li
                        key={shortcut.keys}
                        className="flex h-8 items-center justify-between gap-2 rounded-md px-2 text-sm"
                    >
                        <span className="text-muted-foreground truncate">
                            {shortcut.label}
                        </span>
                        <kbd className="bg-muted text-muted-foreground pointer-events-none inline-flex h-5 items-center rounded border px-1.5 font-mono text-[10px] font-medium select-none">
                            {shortcut.keys}
                        </kbd>
                    </li>
                ))}
            </ul>
        </Section>
    );
}

/**
 * Panneau d'informations : un Sheet shadcn qui glisse depuis la droite
 * par-dessus la page. Ouverture pilotée par le layout.
 */
export function InfoSidebar({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="bg-sidebar text-sidebar-foreground border-sidebar-border w-80 gap-0 p-0 sm:max-w-sm"
            >
                <SheetHeader className="border-sidebar-border border-b px-4 py-3">
                    <SheetTitle className="text-sm">Informations</SheetTitle>
                    <SheetDescription className="text-xs">
                        Membres en ligne, activité et raccourcis.
                    </SheetDescription>
                </SheetHeader>
                <div className="divide-sidebar-border flex-1 divide-y overflow-y-auto">
                    <OnlineSection />
                    <ActivitySection />
                    <ShortcutsSection />
                </div>
            </SheetContent>
        </Sheet>
    );
}
