import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { CreatedBy } from '@/components/created-by';
import { formatAddress } from '@/components/real-estate/columns';
import { RealEstateRowActions } from '@/components/real-estate/real-estate-row-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { partnerTypeIcons } from '@/lib/partner-type-icons';
import { cn } from '@/lib/utils';
import {
    destroy as partnerDestroy,
    show as partnerShow,
} from '@/routes/partners';
import type { Partner, PartnerType } from '@/types';

/** Teinte du badge par type de partenaire. */
export const partnerTypeTones: Record<PartnerType, string> = {
    management: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    insurance:
        'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    bank: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    mover: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    partnership: 'bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
    other: '',
};

export function PartnerTypeBadge({
    type,
    label,
}: {
    type: PartnerType;
    label: string;
}) {
    const Icon = partnerTypeIcons[type];

    return (
        <Badge
            variant="secondary"
            className={cn('gap-1 font-medium', partnerTypeTones[type])}
        >
            <Icon className="size-3" aria-hidden />
            {label}
        </Badge>
    );
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

export const partnerColumnLabels: Record<string, string> = {
    name: 'Partenaire',
    type_label: 'Type',
    contact: 'Contact',
    address: 'Adresse',
    creator: 'Ajouté par',
};

export function partnerColumns(
    onEdit: (partner: Partner) => void,
): ColumnDef<Partner>[] {
    return [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <SortableHeader
                    label="Partenaire"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                />
            ),
            cell: ({ row }) => (
                <div className="grid">
                    <Link
                        href={partnerShow({ partner: row.original.uuid })}
                        className="font-medium hover:underline"
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
                            {row.original.website.replace(/^https?:\/\//, '')}
                        </a>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'type_label',
            header: ({ column }) => (
                <SortableHeader
                    label="Type"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === 'asc')
                    }
                />
            ),
            cell: ({ row }) => (
                <PartnerTypeBadge
                    type={row.original.type}
                    label={row.original.type_label}
                />
            ),
        },
        {
            id: 'contact',
            header: 'Contact',
            cell: ({ row }) => {
                const { contacts, email, phone } = row.original;
                const first = contacts[0];

                if (!first && !email && !phone) {
                    return <span className="text-muted-foreground">—</span>;
                }

                return (
                    <div className="grid text-sm">
                        {first && (
                            <span className="truncate">
                                {first.name}
                                {contacts.length > 1 && (
                                    <span className="text-muted-foreground">
                                        {' '}
                                        +{contacts.length - 1}
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
            accessorFn: (partner) => partner.creator ?? '',
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
                            partnerDestroy({ partner: row.original.uuid }).url
                        }
                        deleteTitle={`Supprimer le partenaire ${row.original.name} ?`}
                        deleteDescription="Sa fiche sera effacée. Cette action est irréversible."
                        onEdit={() => onEdit(row.original)}
                    />
                </div>
            ),
        },
    ];
}
