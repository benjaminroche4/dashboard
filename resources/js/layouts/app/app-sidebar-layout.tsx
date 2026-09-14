import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { useReloading } from '@/hooks/use-reloading';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    const reloading = useReloading();

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="min-w-0 overflow-x-clip">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {/* Le contenu se voile pendant qu'il se recharge : on sait que
                    ce qu'on lit va changer, sans squelette ni saut. */}
                <div
                    data-reloading={reloading ? '' : undefined}
                    className="contents"
                >
                    {children}
                </div>
            </AppContent>
        </AppShell>
    );
}
