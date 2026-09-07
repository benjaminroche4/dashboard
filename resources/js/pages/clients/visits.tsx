import { Head } from '@inertiajs/react';
import { CalendarClock } from 'lucide-react';
import {
    index as clientsIndex,
    visits as clientsVisits,
} from '@/routes/clients';

export default function ClientsVisits() {
    return (
        <>
            <Head title="Visites" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10">
                <div className="pt-8 pb-6">
                    <h1 className="text-lg font-medium">Visites</h1>
                    <p className="text-muted-foreground text-sm">
                        Les visites de logements organisées pour les clients.
                    </p>
                </div>
                <section
                    aria-label="Aucune visite"
                    className="bg-sidebar text-muted-foreground grid place-items-center gap-2 rounded-xl border px-4 py-16 text-center text-sm"
                >
                    <CalendarClock className="size-6" aria-hidden />
                    <p className="text-foreground font-medium">
                        Aucune visite planifiée pour le moment
                    </p>
                    <p className="max-w-md text-pretty">
                        Les visites organisées avec les agents immobiliers
                        apparaîtront ici, par client et par date.
                    </p>
                </section>
            </div>
        </>
    );
}

ClientsVisits.layout = {
    breadcrumbs: [
        { title: 'Clients', href: clientsIndex() },
        { title: 'Visites', href: clientsVisits() },
    ],
};
