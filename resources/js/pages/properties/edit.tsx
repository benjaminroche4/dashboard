import { Head } from '@inertiajs/react';
import { PropertyFormPanel } from '@/components/properties/property-form';
import {
    create as propertyCreate,
    index as propertiesIndex,
} from '@/routes/properties';
import type { Property, PropertyFormOptions } from '@/types';

type Props = PropertyFormOptions & {
    /** Bien à modifier ; null sur la page d'ajout. */
    property: Property | null;
    /** Propriétaire présélectionné (`?owner=UUID`, depuis sa fiche). */
    defaultOwnerId?: number | null;
};

/** Page dédiée d'ajout ou de modification d'un bien de l'annuaire. */
export default function PropertyEdit({
    property,
    defaultOwnerId = null,
    ...options
}: Props) {
    const title =
        property === null ? 'Nouveau bien' : `Modifier ${property.label}`;

    return (
        <>
            <Head title={title} />
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pt-8 pb-10">
                {/* Le formulaire porte son en-tête (titre, bouton d'import) et
                    son enveloppe : la saisie à gauche, le récapitulatif à droite. */}
                <PropertyFormPanel
                    options={options}
                    property={property}
                    defaultOwnerId={defaultOwnerId}
                />
            </div>
        </>
    );
}

PropertyEdit.layout = {
    breadcrumbs: [
        { title: 'Réseau', href: propertiesIndex() },
        { title: 'Biens', href: propertiesIndex() },
        // Le dernier fil dit ce qu'on fait, comme « Nouvelle facture » ou « Nouveau devis ».
        { title: 'Nouveau bien', href: propertyCreate() },
    ],
};
