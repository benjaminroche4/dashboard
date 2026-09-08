import {
    BedDouble,
    Building2,
    Compass,
    FileText,
    Home,
    Layers,
    MapPin,
    Ruler,
    Sofa,
    Wallet,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/format';
import type { LeadPropertyDetail } from '@/types';

type Fact = { label: string; value: ReactNode; icon: ReactNode };

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

/** Chambres et salles de bain sur une ligne, avec le « + » des paliers du site. */
function describeRooms(
    bedrooms: number | null,
    bathrooms: number | null,
): string | null {
    const parts: string[] = [];

    if (bedrooms !== null) {
        parts.push(
            `${bedrooms}${bedrooms >= 5 ? '+' : ''} chambre${bedrooms > 1 ? 's' : ''}`,
        );
    }

    if (bathrooms !== null) {
        parts.push(
            `${bathrooms}${bathrooms >= 4 ? '+' : ''} salle${bathrooms > 1 ? 's' : ''} de bain`,
        );
    }

    return parts.length === 0 ? null : parts.join(' · ');
}

/**
 * Bloc « Bien proposé » de la fiche d'un lead propriétaire : les réponses du
 * formulaire « Proposer un bien », sur deux colonnes, puis les équipements et la note.
 */
export function LeadPropertyCard({
    property,
}: {
    property: LeadPropertyDetail;
}) {
    const perMonth = (cents: number | null) =>
        cents === null ? null : `${formatMoney(cents, 'EUR')} / mois`;
    const facts: (Fact | null)[] = [
        property.address
            ? { label: 'Adresse', value: property.address, icon: icon(MapPin) }
            : null,
        property.property_type_label
            ? {
                  label: 'Type de bien',
                  value: property.property_type_label,
                  icon: icon(Home),
              }
            : null,
        property.property_status_label
            ? {
                  label: 'Statut',
                  value: property.property_status_label,
                  icon: icon(Building2),
              }
            : null,
        describeRooms(property.bedrooms, property.bathrooms)
            ? {
                  label: 'Pièces',
                  value: describeRooms(property.bedrooms, property.bathrooms),
                  icon: icon(BedDouble),
              }
            : null,
        property.surface !== null
            ? {
                  label: 'Surface',
                  value: `${property.surface} m²`,
                  icon: icon(Ruler),
              }
            : null,
        describeFloor(property.floor, property.building_floors)
            ? {
                  label: 'Étage',
                  value: describeFloor(
                      property.floor,
                      property.building_floors,
                  ),
                  icon: icon(Layers),
              }
            : null,
        property.furnishing_label
            ? {
                  label: 'Meublé',
                  value: property.furnishing_label,
                  icon: icon(Sofa),
              }
            : null,
        property.orientation_labels.length > 0
            ? {
                  label: 'Orientation',
                  value: property.orientation_labels.join(', '),
                  icon: icon(Compass),
              }
            : null,
        property.lease_type_labels.length > 0
            ? {
                  label: 'Type de bail',
                  value: property.lease_type_labels.join(', '),
                  icon: icon(FileText),
              }
            : null,
        perMonth(property.rent_cents)
            ? {
                  label: 'Loyer hors charges',
                  value: perMonth(property.rent_cents),
                  icon: icon(Wallet),
              }
            : null,
        perMonth(property.charges_cents)
            ? {
                  label: 'Charges',
                  value: perMonth(property.charges_cents),
                  icon: icon(Wallet),
              }
            : null,
        property.deposit_cents !== null
            ? {
                  label: 'Dépôt de garantie',
                  value: formatMoney(property.deposit_cents, 'EUR'),
                  icon: icon(Wallet),
              }
            : null,
    ];
    const filled = facts.filter((fact): fact is Fact => fact !== null);

    if (
        filled.length === 0 &&
        property.amenity_labels.length === 0 &&
        !property.note
    ) {
        return <p className="text-muted-foreground text-sm">Non renseigné</p>;
    }

    return (
        <div className="grid gap-5" data-testid="lead-property">
            {filled.length > 0 && (
                <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                    {filled.map((fact) => (
                        <div key={fact.label} className="grid min-w-0 gap-0.5">
                            <dt className="text-muted-foreground flex items-center gap-1.5">
                                {fact.icon}
                                {fact.label}
                            </dt>
                            <dd className="min-w-0 truncate font-medium tabular-nums">
                                {fact.value}
                            </dd>
                        </div>
                    ))}
                </dl>
            )}
            {property.amenity_labels.length > 0 && (
                <div className="grid gap-2">
                    <p className="text-muted-foreground text-sm">Équipements</p>
                    <ul role="list" className="flex flex-wrap gap-1.5">
                        {property.amenity_labels.map((label) => (
                            <li key={label}>
                                <Badge variant="secondary">{label}</Badge>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {property.note && (
                <div className="grid gap-1">
                    <p className="text-muted-foreground text-sm">
                        Note du propriétaire
                    </p>
                    <p className="text-sm/6 whitespace-pre-line">
                        {property.note}
                    </p>
                </div>
            )}
        </div>
    );
}
