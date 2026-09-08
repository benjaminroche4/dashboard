import { Head, Link } from '@inertiajs/react';
import { Home, Plus } from 'lucide-react';
import { useState } from 'react';
import { PropertyCard } from '@/components/properties/property-card';
import { formatAddress } from '@/components/real-estate/columns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    create as propertyCreate,
    index as propertiesIndex,
} from '@/routes/properties';
import type { Property, PropertyFormOptions } from '@/types';

type Props = PropertyFormOptions & {
    properties: Property[];
};

export default function PropertiesIndex({ properties }: Props) {
    const [filter, setFilter] = useState('');
    const needle = filter.trim().toLocaleLowerCase('fr');
    const visible =
        needle === ''
            ? properties
            : properties.filter((property) =>
                  [property.label, formatAddress(property) ?? '']
                      .join(' ')
                      .toLocaleLowerCase('fr')
                      .includes(needle),
              );
    const visited = properties.filter(
        (property) => property.visits_count > 0,
    ).length;

    return (
        <>
            <Head title="Biens" />
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10">
                <div className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-6">
                    <div>
                        <h1 className="text-lg font-medium">Biens</h1>
                        <p className="text-muted-foreground text-sm">
                            {properties.length} bien(s)
                            {visited > 0 && ` · ${visited} déjà visité(s)`}
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={propertyCreate()}>
                            <Plus />
                            Nouveau bien
                        </Link>
                    </Button>
                </div>
                {properties.length === 0 ? (
                    <section
                        aria-label="Aucun bien"
                        className="bg-sidebar text-muted-foreground grid place-items-center gap-2 rounded-xl border px-4 py-16 text-center text-sm"
                    >
                        <Home className="size-6" aria-hidden />
                        <p className="text-foreground font-medium">
                            Aucun bien dans l’annuaire pour le moment
                        </p>
                        <p className="max-w-md text-pretty">
                            Ajoutez un bien avec ses photos : il apparaîtra ici
                            en carte, prêt à être proposé et visité.
                        </p>
                    </section>
                ) : (
                    <div className="grid gap-4">
                        <Input
                            value={filter}
                            onChange={(event) => setFilter(event.target.value)}
                            placeholder="Filtrer par bien ou adresse…"
                            aria-label="Filtrer par bien ou adresse"
                            className="max-w-sm"
                        />
                        {visible.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                Aucun bien ne correspond à ce filtre.
                            </p>
                        ) : (
                            <div
                                role="list"
                                aria-label="Biens"
                                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                            >
                                {visible.map((property) => (
                                    <div role="listitem" key={property.id}>
                                        <PropertyCard property={property} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

PropertiesIndex.layout = {
    breadcrumbs: [
        { title: 'Réseau', href: propertiesIndex() },
        { title: 'Biens', href: propertiesIndex() },
    ],
};
