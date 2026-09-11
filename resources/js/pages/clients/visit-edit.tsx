import { Head } from '@inertiajs/react';
import { Panel } from '@/components/panel';
import { VisitForm } from '@/components/visits/visit-form';
import {
    index as clientsIndex,
    visits as clientsVisits,
} from '@/routes/clients';
import { create as visitCreate } from '@/routes/clients/visits';
import type {
    PropertyFormOptions,
    Visit,
    VisitClientOption,
    VisitModeOption,
    VisitPropertyOption,
} from '@/types';

type Props = PropertyFormOptions & {
    visit: Visit;
    clients: VisitClientOption[];
    /** Les deux façons de visiter. */
    visitModes: VisitModeOption[];
    properties: VisitPropertyOption[];
};

/** Modification d'une visite : même formulaire que la planification, prérempli. */
export default function VisitEdit({
    visit,
    clients,
    visitModes,
    properties,
    ...options
}: Props) {
    return (
        <>
            <Head title={`Modifier la visite de ${visit.client.name}`} />
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-10">
                <div className="pt-8">
                    <h1 className="text-lg font-medium">Modifier la visite</h1>
                    <p className="text-muted-foreground text-sm">
                        Créneau, bien visité, membre de l’équipe et agent
                        présent. Le client de la visite ne change pas.
                    </p>
                </div>
                <Panel title="Visite">
                    <VisitForm
                        clients={clients}
                        visitModes={visitModes}
                        properties={properties}
                        options={options}
                        visit={visit}
                    />
                </Panel>
            </div>
        </>
    );
}

VisitEdit.layout = {
    breadcrumbs: [
        { title: 'Clients', href: clientsIndex() },
        { title: 'Visites', href: clientsVisits() },
        { title: 'Modifier la visite', href: visitCreate() },
    ],
};
