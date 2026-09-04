import { Breadcrumbs } from '@/components/breadcrumbs';
import { Notifications } from '@/components/notifications';
import { OnlineStaff } from '@/components/online-staff';
import { RealtimeStaff } from '@/components/realtime-staff';
import { SearchCommand } from '@/components/search-command';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { sampleNotifications } from '@/data/sample-notifications';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

/**
 * En-tête de page en trois zones : navigation à gauche, recherche au centre,
 * notifications et présence à droite.
 */
export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    return (
        <header className="border-sidebar-border/50 grid h-16 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex min-w-0 items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            <div className="flex w-[min(28rem,40vw)] justify-center max-md:hidden">
                <SearchCommand />
            </div>

            <div className="flex items-center justify-end gap-2">
                <RealtimeStaff />
                <OnlineStaff />
                {/* Données d'exemple en attendant le temps réel. */}
                <Notifications items={sampleNotifications} />
            </div>
        </header>
    );
}
