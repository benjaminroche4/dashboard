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
    VisitClientOption,
    VisitPropertyOption,
} from '@/types';

type Props = PropertyFormOptions & {
    clients: VisitClientOption[];
    properties: VisitPropertyOption[];
    /** Client présélectionné (`?client=UUID`, depuis un dossier). */
    defaultClientId: number | null;
    /** Bien présélectionné (`?property=UUID`, depuis un dossier). */
    defaultPropertyId?: number | null;
};

export default function VisitCreate({
    clients,
    properties,
    defaultClientId,
    defaultPropertyId = null,
    ...options
}: Props) {
    return (
        <>
            <Head title="Planifier une visite" />
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-10">
                <div className="pt-8">
                    <h1 className="text-lg font-medium">
                        Planifier une visite
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Choisissez le client et le bien à visiter. Un bien saisi
                        ici est ajouté à l’annuaire des biens.
                    </p>
                </div>
                <Panel title="Visite">
                    <VisitForm
                        clients={clients}
                        properties={properties}
                        options={options}
                        defaultClientId={defaultClientId}
                        defaultPropertyId={defaultPropertyId}
                    />
                </Panel>
            </div>
        </>
    );
}

VisitCreate.layout = {
    breadcrumbs: [
        { title: 'Clients', href: clientsIndex() },
        { title: 'Visites', href: clientsVisits() },
        { title: 'Planifier une visite', href: visitCreate() },
    ],
};
