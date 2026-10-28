import {
    Bath,
    BedDouble,
    Building2,
    Compass,
    FileText,
    Home,
    Layers,
    MapPin,
    NotebookPen,
    Ruler,
    Sofa,
    Sparkles,
    Wallet,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { AddressMapButton } from '@/components/address-map-dialog';
import {
    InlineField,
    type InlineEdit,
    type InlineValue,
} from '@/components/inline-field';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/format';
import { propertyAmenityIcons } from '@/lib/property-amenity-icons';
import type { LeadPropertyDetail, LeadPropertyOptions } from '@/types';

type Fact = {
    /** Nom du champ côté serveur (`UpdateLeadPropertyFieldsRequest::FIELDS`). */
    name: string;
    label: string;
    value: ReactNode;
    empty: boolean;
    icon: ReactNode;
    edit: InlineEdit;
    /** Sous la valeur, hors du bouton de modification (le bouton « Voir sur la carte »). */
    after?: ReactNode;
};

const icon = (Icon: typeof Home) => <Icon className="size-3.5" aria-hidden />;

/** « 3e sur 6 », « Rez-de-chaussée », « 2e sous-sol ». */
export function describeFloor(
    floor: number | null,
    buildingFloors: number | null,
): string | null {
    if (floor === null && buildingFloors === null) {
        return null;
    }

    let level: string | null = null;

    if (floor !== null) {
        level =
            floor === 0
                ? 'Rez-de-chaussée'
                : floor < 0
                  ? `${Math.abs(floor)}${Math.abs(floor) === 1 ? 'er' : 'e'} sous-sol`
                  : `${floor}${floor === 1 ? 'er' : 'e'}`;
    }

    if (buildingFloors === null) {
        return level;
    }

    return level === null
        ? `Immeuble de ${buildingFloors} étages`
        : `${level} sur ${buildingFloors}`;
}

/** « 2 chambres », « 5+ chambres » (le « + » des paliers du site). */
function describeCount(
    count: number | null,
    singular: string,
    plural: string,
    plusFrom: number,
): string | null {
    if (count === null) {
        return null;
    }

    return `${count}${count >= plusFrom ? '+' : ''} ${count > 1 ? plural : singular}`;
}

const empty = (
    <Badge variant="outline" className="text-muted-foreground font-normal">
        Non renseigné
    </Badge>
);

type Props = {
    property: LeadPropertyDetail;
    /** Listes des sélecteurs ; sans elles, rien n'est modifiable. */
    options?: LeadPropertyOptions | null;
    /** Enregistre un champ modifié en place (`name` côté serveur). */
    onSave?: (name: string, value: InlineValue) => void;
    /** Nom du champ en cours d'enregistrement. */
    saving?: string | null;
    /** Refus du serveur par champ, affiché sous le contrôle. */
    fieldErrors?: Record<string, string>;
    /** Faux sans clé Google : l'adresse se tape sans suggestions. */
    addressAutocomplete?: boolean;
};

/**
 * Bloc « Bien proposé » de la fiche d'un lead propriétaire : les réponses du
 * formulaire « Proposer un bien » en lignes à filets, libellé à gauche et
 * valeur à droite (disposition retenue le 28 octobre 2026 parmi quatre
 * variantes). **Chaque champ reste affiché même vide**, en « Non renseigné »
 * qu'on complète en place (`InlineField`) comme le projet d'un lead
 * locataire ; l'adresse se cherche dans Google Places et, une fois géocodée,
 * s'ouvre sur la carte.
 */
export function LeadPropertyCard({
    property,
    options = null,
    onSave,
    saving = null,
    fieldErrors = {},
    addressAutocomplete = false,
}: Props) {
    const perMonth = (cents: number | null) =>
        cents === null ? null : `${formatMoney(cents, 'EUR')} / mois`;
    const select = (
        value: string | null,
        list: keyof LeadPropertyOptions,
    ): InlineEdit => ({
        kind: 'select',
        value,
        options: options?.[list] ?? [],
    });
    const multi = (
        value: string[],
        list: keyof LeadPropertyOptions,
    ): InlineEdit => ({
        kind: 'multi',
        value,
        options: options?.[list] ?? [],
    });
    const number = (
        value: number | null,
        extra: { suffix?: string; min?: number; max?: number } = {},
    ): InlineEdit => ({ kind: 'number', value, ...extra });
    const money = (value: number | null, suffix: string): InlineEdit => ({
        kind: 'money',
        value,
        suffix,
    });
    const amenities = property.amenity_labels.map((label, index) => {
        const key = property.amenities[index];
        const Icon = key ? propertyAmenityIcons[key] : null;

        return { label, Icon };
    });
    const floor = describeFloor(property.floor, null);
    const bedrooms = describeCount(property.bedrooms, 'chambre', 'chambres', 5);
    const bathrooms = describeCount(
        property.bathrooms,
        'salle de bain',
        'salles de bain',
        4,
    );

    const facts: Fact[] = [
        {
            name: 'address',
            label: 'Adresse',
            value: property.address,
            empty: property.address === null,
            icon: icon(MapPin),
            edit: {
                kind: 'address',
                value: property.address,
                placeId: property.place_id,
                enabled: addressAutocomplete,
            },
            after: (
                <AddressMapButton
                    place={{
                        name: property.address ?? 'Bien proposé',
                        address: property.address,
                        latitude: property.latitude,
                        longitude: property.longitude,
                    }}
                />
            ),
        },
        {
            name: 'property_type',
            label: 'Type de bien',
            value: property.property_type_label,
            empty: property.property_type_label === null,
            icon: icon(Home),
            edit: select(property.property_type, 'propertyTypes'),
        },
        {
            name: 'property_status',
            label: 'Disponibilité',
            value: property.property_status_label,
            empty: property.property_status_label === null,
            icon: icon(Building2),
            edit: select(property.property_status, 'propertyStatuses'),
        },
        {
            name: 'bedrooms',
            label: 'Chambres',
            value: bedrooms,
            empty: bedrooms === null,
            icon: icon(BedDouble),
            edit: number(property.bedrooms, { min: 0, max: 5 }),
        },
        {
            name: 'bathrooms',
            label: 'Salles de bain',
            value: bathrooms,
            empty: bathrooms === null,
            icon: icon(Bath),
            edit: number(property.bathrooms, { min: 1, max: 4 }),
        },
        {
            name: 'surface',
            label: 'Surface',
            value: property.surface === null ? null : `${property.surface} m²`,
            empty: property.surface === null,
            icon: icon(Ruler),
            edit: number(property.surface, { suffix: 'm²', min: 0 }),
        },
        {
            name: 'floor',
            label: 'Étage',
            value: floor,
            empty: floor === null,
            icon: icon(Layers),
            edit: number(property.floor, { min: -5, max: 99 }),
        },
        {
            name: 'building_floors',
            label: "Étages de l'immeuble",
            value: property.building_floors,
            empty: property.building_floors === null,
            icon: icon(Layers),
            edit: number(property.building_floors, { min: 0, max: 99 }),
        },
        {
            name: 'furnishing',
            label: 'Meublé',
            value: property.furnishing_label,
            empty: property.furnishing_label === null,
            icon: icon(Sofa),
            edit: select(property.furnishing, 'furnishingOptions'),
        },
        {
            name: 'orientations',
            label: 'Orientation',
            value: property.orientation_labels.join(', '),
            empty: property.orientation_labels.length === 0,
            icon: icon(Compass),
            edit: multi(property.orientations, 'orientations'),
        },
        {
            name: 'lease_types',
            label: 'Type de bail',
            value: property.lease_type_labels.join(', '),
            empty: property.lease_type_labels.length === 0,
            icon: icon(FileText),
            edit: multi(property.lease_types, 'leaseTypes'),
        },
        {
            name: 'rent_cents',
            label: 'Loyer hors charges',
            value: perMonth(property.rent_cents),
            empty: property.rent_cents === null,
            icon: icon(Wallet),
            edit: money(property.rent_cents, '€ / mois'),
        },
        {
            name: 'charges_cents',
            label: 'Charges',
            value: perMonth(property.charges_cents),
            empty: property.charges_cents === null,
            icon: icon(Wallet),
            edit: money(property.charges_cents, '€ / mois'),
        },
        {
            name: 'deposit_cents',
            label: 'Dépôt de garantie',
            value:
                property.deposit_cents === null
                    ? null
                    : formatMoney(property.deposit_cents, 'EUR'),
            empty: property.deposit_cents === null,
            icon: icon(Wallet),
            edit: money(property.deposit_cents, '€'),
        },
        {
            name: 'amenities',
            label: 'Équipements',
            value: (
                <span className="flex flex-wrap gap-x-3 gap-y-1">
                    {amenities.map(({ label, Icon }) => (
                        <span
                            key={label}
                            className="inline-flex items-center gap-1 font-medium"
                        >
                            {Icon && (
                                <Icon
                                    className="text-muted-foreground size-3.5"
                                    aria-hidden
                                />
                            )}
                            {label}
                        </span>
                    ))}
                </span>
            ),
            empty: amenities.length === 0,
            icon: icon(Sparkles),
            edit: multi(property.amenities, 'amenities'),
        },
        {
            name: 'note',
            label: 'Note du propriétaire',
            value: (
                <span className="text-sm/6 font-normal whitespace-pre-line">
                    {property.note}
                </span>
            ),
            empty: property.note === null,
            icon: icon(NotebookPen),
            edit: { kind: 'textarea', value: property.note },
        },
    ];

    return (
        <dl className="divide-y text-sm" data-testid="lead-property">
            {facts.map((fact) => (
                <div
                    key={fact.name}
                    className="grid gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[10rem_minmax(0,1fr)]"
                >
                    <dt className="text-muted-foreground flex items-center gap-1.5">
                        {fact.icon}
                        {fact.label}
                    </dt>
                    <dd className="grid min-w-0 gap-1 font-medium [overflow-wrap:anywhere] tabular-nums">
                        {onSave ? (
                            <InlineField
                                label={fact.label}
                                display={fact.empty ? empty : fact.value}
                                edit={fact.edit}
                                saving={saving === fact.name}
                                error={fieldErrors[fact.name]}
                                onSave={(value) => onSave(fact.name, value)}
                            />
                        ) : fact.empty ? (
                            <span>{empty}</span>
                        ) : (
                            <span>{fact.value}</span>
                        )}
                        {fact.after}
                    </dd>
                </div>
            ))}
        </dl>
    );
}
