import { Head } from '@inertiajs/react';
import { Panel } from '@/components/panel';
import { PropertyFormPanel } from '@/components/properties/property-form';
import {
    create as propertyCreate,
    index as propertiesIndex,
} from '@/routes/properties';
import type { Property, PropertyFormOptions } from '@/types';

type Props = PropertyFormOptions & {
    /** Bien à modifier ; null sur la page d'ajout. */
    property: Property | null;
};

/** Page dédiée d'ajout ou de modification d'un bien de l'annuaire. */
export default function PropertyEdit({ property, ...options }: Props) {
    const editing = property !== null;
    const title = editing ? `Modifier ${property.label}` : 'Nouveau bien';

    return (
        <>
            <Head title={title} />
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-10">
                <div className="pt-8">
                    <h1 className="text-lg font-medium">{title}</h1>
                    <p className="text-muted-foreground text-sm">
                        {editing
                            ? 'Adresse, caractéristiques, loyer et contacts du bien.'
                            : 'Seule l’adresse est obligatoire. Le bien pourra ensuite être proposé en visite.'}
                    </p>
                </div>
                <Panel title="Bien">
                    <PropertyFormPanel options={options} property={property} />
                </Panel>
            </div>
        </>
    );
}

PropertyEdit.layout = {
    breadcrumbs: [
        { title: 'Réseau', href: propertiesIndex() },
        { title: 'Biens', href: propertiesIndex() },
        { title: 'Bien', href: propertyCreate() },
    ],
};
