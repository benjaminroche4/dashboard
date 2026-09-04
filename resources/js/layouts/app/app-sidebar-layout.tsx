import { useState } from 'react';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { InfoSidebar } from '@/components/info-sidebar';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    const [infoOpen, setInfoOpen] = useState(false);

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="min-w-0 overflow-x-clip">
                <AppSidebarHeader
                    breadcrumbs={breadcrumbs}
                    infoOpen={infoOpen}
                    onToggleInfo={() => setInfoOpen((open) => !open)}
                />
                {children}
            </AppContent>
            <InfoSidebar open={infoOpen} onOpenChange={setInfoOpen} />
        </AppShell>
    );
}
