import { Head } from '@inertiajs/react';
import AppearanceTabs from '@/components/appearance-tabs';
import { Panel } from '@/components/panel';
import { edit as editAppearance } from '@/routes/appearance';

export default function Appearance() {
    return (
        <>
            <Head title="Apparence" />

            <Panel
                title="Thème"
                description="Choisissez le thème d’affichage de votre compte"
            >
                <AppearanceTabs />
                <p className="text-muted-foreground mt-3 text-xs">
                    « Système » suit le réglage clair ou sombre de votre
                    appareil.
                </p>
            </Panel>
        </>
    );
}

Appearance.layout = {
    breadcrumbs: [
        {
            title: 'Apparence',
            href: editAppearance(),
        },
    ],
};
