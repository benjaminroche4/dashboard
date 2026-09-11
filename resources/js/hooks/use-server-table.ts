import { router } from '@inertiajs/react';
import type { SortingState } from '@tanstack/react-table';
import { useEffect, useRef, useState } from 'react';
import type { ServerTableState } from '@/components/data-table';

/** Pagination renvoyée par Laravel (`paginate()`), simplifiée pour le front. */
export type ServerPagination = {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
};

/** Filtres de la liste tels que le serveur les a compris. */
export type ServerTableFilters = {
    q: string;
    sort: string;
    dir: 'asc' | 'desc';
    /** Un filtre à choix multiple (statuts cochés) voyage en tableau. */
    [key: string]: string | string[] | null | undefined;
};

/**
 * Pilote une Data Table en mode serveur : la recherche (300 ms après la
 * frappe), la page et le tri repartent en visite Inertia (`GET`, état et
 * défilement préservés, historique remplacé) et ne rechargent que `only`.
 */
export function useServerTable({
    url,
    pagination,
    filters,
    only,
}: {
    url: string;
    pagination: ServerPagination;
    filters: ServerTableFilters;
    /** Props Inertia à recharger (ex. `['invoices', 'pagination', 'filters']`). */
    only: string[];
}): ServerTableState & {
    /** Change un filtre de la liste (statut, favoris…) et revient page 1. */
    setFilter: (key: string, value: string | string[] | null) => void;
} {
    const [query, setQuery] = useState(filters.q);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Une recherche revenue du serveur (bouton Précédent du navigateur, rechargement) réaligne le champ.
    useEffect(() => {
        setQuery(filters.q);
    }, [filters.q]);

    const visit = (
        params: Record<string, string | number | string[] | null>,
    ) => {
        const { q, sort, dir, ...rest } = filters;
        const data: Record<string, string | number | string[]> = {};

        for (const [key, value] of Object.entries({
            ...rest,
            q,
            sort,
            dir,
            page: pagination.current_page,
            ...params,
        })) {
            if (Array.isArray(value)) {
                if (value.length > 0) {
                    data[key] = value;
                }

                continue;
            }

            if (value !== null && value !== undefined && value !== '') {
                data[key] = value;
            }
        }

        // La page 1 et le tri par défaut n'encombrent pas l'URL.
        if (data.page === 1) {
            delete data.page;
        }

        router.get(url, data, {
            only,
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const onQueryChange = (next: string) => {
        setQuery(next);

        if (timer.current) {
            clearTimeout(timer.current);
        }

        timer.current = setTimeout(() => visit({ q: next, page: 1 }), 300);
    };

    return {
        setFilter: (key, value) => visit({ [key]: value, page: 1 }),
        page: pagination.current_page,
        lastPage: pagination.last_page,
        total: pagination.total,
        query,
        sorting: [{ id: filters.sort, desc: filters.dir === 'desc' }],
        onQueryChange,
        onPageChange: (page) => visit({ page }),
        onSortingChange: (sorting: SortingState) => {
            const [first] = sorting;

            visit({
                sort: first?.id ?? filters.sort,
                dir: first ? (first.desc ? 'desc' : 'asc') : 'desc',
                page: 1,
            });
        },
    };
}
