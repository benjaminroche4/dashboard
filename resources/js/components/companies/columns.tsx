import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { CreatedBy } from '@/components/created-by';
import { formatAddress } from '@/components/real-estate/columns';
import { RealEstateRowActions } from '@/components/real-estate/real-estate-row-actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    destroy as companyDestroy,
    show as companyShow,
} from '@/routes/companies';
import type { CompanyEntry } from '@/types';

/** Deux lettres au plus, pour la pastille d'une entreprise sans logo. */
function companyInitials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() ?? '')
        .join('');
}

function SortableHeader({
    label,
    onClick,
}: {
    label: string;
    onClick: () => void;
}) {
    return (
        <Button variant="ghost" onClick={onClick} className="-ml-3">
            {label}
            <ArrowUpDown />
        </Button>
    );
}

export const companyColumnLabels: Record<string, string> = {
    name: 'Entreprise',
    contact: 'Contacts principaux',
    clients_count: 'Clients',
    address: 'Adresse',
    creator: 'Ajouté par',
};

export function companyColumns(
    onEdit: (company: CompanyEntry) => void,
): ColumnDef<CompanyEntry>[] {
    return [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <SortableHeader
                    label="Entreprise"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                />
            ),
            cell: ({ row }) => (
                <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-8 rounded-md border">
                        <AvatarImage
                            src={row.original.logo ?? undefined}
                            alt=""
                            className="object-contain p-0.5"
                        />
                        <AvatarFallback className="bg-primary/10 text-primary rounded-md text-xs font-medium">
                            {companyInitials(row.original.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="grid min-w-0">
                        <Link
                            href={companyShow({ company: row.original.uuid })}
                            className="truncate font-medium hover:underline"
                        >
                            {row.original.name}
                        </Link>
                        {row.original.website && (
                            <a
                                href={row.original.website}
                                target="_blank"
                                rel="noreferrer"
                                className="text-muted-foreground truncate text-xs underline-offset-4 hover:underline"
                            >
                                {row.original.website.replace(
                                    /^https?:\/\//,
                                    '',
                                )}
                            </a>
                        )}
                    </div>
                </div>
            ),
        },
        {
            id: 'contact',
            header: 'Contacts principaux',
            cell: ({ row }) => {
                const { contacts, email, phone } = row.original;
                const primaries = contacts.filter(
                    (contact) => contact.is_primary,
                );
                const shown = primaries.length > 0 ? primaries : contacts;
                const first = shown[0];

                if (!first && !email && !phone) {
                    return <span className="text-muted-foreground">—</span>;
                }

                return (
                    <div className="grid text-sm">
                        {first && (
                            <span className="truncate">
                                {first.name}
                                {shown.length > 1 && (
                                    <span className="text-muted-foreground">
                                        {' '}
                                        +{shown.length - 1}
                                    </span>
                                )}
                            </span>
                        )}
                        {email && (
                            <a
                                href={`mailto:${email}`}
                                className="text-muted-foreground truncate underline-offset-4 hover:underline"
                            >
                                {email}
                            </a>
                        )}
                        {phone && (
                            <a
                                href={`tel:${phone.replace(/\s+/g, '')}`}
                                className="text-muted-foreground underline-offset-4 hover:underline"
                            >
                                {phone}
                            </a>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'clients_count',
            header: ({ column }) => (
                <SortableHeader
                    label="Clients"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                />
            ),
            cell: ({ row }) => (
                <Badge variant="secondary" className="tabular-nums">
                    {row.original.clients_count}
                </Badge>
            ),
        },
        {
            id: 'address',
            header: 'Adresse',
            cell: ({ row }) => (
                <span className="text-muted-foreground">
                    {formatAddress(row.original) ?? '—'}
                </span>
            ),
        },
        {
            id: 'creator',
            accessorFn: (company) => company.creator ?? '',
            header: 'Ajouté par',
            cell: ({ row }) => (
                <span className="text-muted-foreground text-sm">
                    <CreatedBy
                        name={row.original.creator}
                        avatar={row.original.creator_avatar}
                        verb=""
                    />
                </span>
            ),
        },
        {
            id: 'actions',
            enableHiding: false,
            cell: ({ row }) => (
                <div className="text-right">
                    <RealEstateRowActions
                        name={row.original.name}
                        deleteUrl={
                            companyDestroy({ company: row.original.uuid }).url
                        }
                        deleteTitle={`Supprimer l’entreprise ${row.original.name} ?`}
                        deleteDescription="Sa fiche et ses contacts seront effacés. Les dossiers clients rattachés sont conservés. Cette action est irréversible."
                        onEdit={() => onEdit(row.original)}
                    />
                </div>
            ),
        },
    ];
}
