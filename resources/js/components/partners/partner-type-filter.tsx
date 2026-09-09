import { FilterMenu } from '@/components/filter-menu';
import { partnerTypeIcons } from '@/lib/partner-type-icons';
import type { PartnerType, PartnerTypeOption } from '@/types';

/** Filtre par type des partenaires : le menu « Filtres » générique, avec l'icône de chaque type. */
export function PartnerTypeFilter({
    types,
    counts,
    value,
    onChange,
}: {
    types: PartnerTypeOption[];
    counts: Partial<Record<PartnerType, number>>;
    /** Types cochés ; vide = tous les partenaires. */
    value: PartnerType[];
    onChange: (value: PartnerType[]) => void;
}) {
    return (
        <FilterMenu
            title="Type de partenaire"
            options={types.map((type) => {
                const Icon = partnerTypeIcons[type.value];

                return {
                    value: type.value,
                    label: type.label,
                    icon: (
                        <Icon
                            className="text-muted-foreground size-3.5"
                            aria-hidden
                        />
                    ),
                };
            })}
            counts={counts}
            value={value}
            onChange={onChange}
        />
    );
}
