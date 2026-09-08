import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    Contact,
    House,
    Mail,
    MessageCircle,
    Phone,
} from 'lucide-react';
import { useState } from 'react';
import { OwnerDialog } from '@/components/owners/owner-dialog';
import { OwnerStatusBadge } from '@/components/owners/owner-status-badge';
import { formatAddress } from '@/components/real-estate/columns';
import {
    DetailHeader,
    DetailRow,
    DetailSection,
    missingValue,
} from '@/components/real-estate/detail-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/format';
import { show as leadShow } from '@/routes/leads';
import {
    convert as ownerConvert,
    destroy as ownerDestroy,
    index as ownersIndex,
} from '@/routes/owners';
import { show as propertyShow } from '@/routes/properties';
import type { Owner, OwnerStatusOption, Property } from '@/types';

const contactDate = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

type Props = {
    owner: Owner;
    /** Biens de l'annuaire rattachés à ce propriétaire. */
    properties: Property[];
    statuses: OwnerStatusOption[];
};

/** Fiche d'un propriétaire : coordonnées, lead de gestion locative, biens, notes. */
export default function OwnerShow({ owner, properties, statuses }: Props) {
    const [editing, setEditing] = useState(false);
    const [converting, setConverting] = useState(false);
    const address = formatAddress(owner);
    const phoneDigits = owner.phone?.replace(/\s+/g, '') ?? '';

    const convert = () => {
        setConverting(true);
        router.post(
            ownerConvert({ owner: owner.uuid }).url,
            {},
            { onFinish: () => setConverting(false) },
        );
    };

    return (
        <>
            <Head title={`Propriétaire ${owner.name}`} />
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-10">
                <DetailHeader
                    name={owner.name}
                    subtitle={
                        <>
                            {owner.company && <span>{owner.company}</span>}
                            <OwnerStatusBadge
                                status={owner.status}
                                label={owner.status_label}
                            />
                            {owner.last_contacted_at && (
                                <span>
                                    Dernier contact le{' '}
                                    {contactDate.format(
                                        new Date(owner.last_contacted_at),
                                    )}
                                </span>
                            )}
                        </>
                    }
                    creator={owner.creator}
                    creatorAvatar={owner.creator_avatar}
                    createdAt={owner.created_at}
                    onEdit={() => setEditing(true)}
                    deleteUrl={ownerDestroy({ owner: owner.uuid }).url}
                    deleteTitle={`Supprimer le propriétaire ${owner.name} ?`}
                    deleteDescription="Sa fiche sera effacée ; ses biens et son lead éventuel sont conservés. Cette action est irréversible."
                    backHref={ownersIndex().url}
                    backLabel="Tous les propriétaires"
                />

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    <div className="divide-y">
                        <DetailSection title="Contact">
                            <dl className="grid gap-3">
                                <DetailRow label="E-mail">
                                    {owner.email ? (
                                        <a
                                            href={`mailto:${owner.email}`}
                                            className="underline-offset-4 hover:underline"
                                        >
                                            {owner.email}
                                        </a>
                                    ) : (
                                        missingValue
                                    )}
                                </DetailRow>
                                <DetailRow label="Téléphone">
                                    {owner.phone ? (
                                        <a
                                            href={`tel:${phoneDigits}`}
                                            className="underline-offset-4 hover:underline"
                                        >
                                            {owner.phone}
                                        </a>
                                    ) : (
                                        missingValue
                                    )}
                                </DetailRow>
                                <DetailRow label="Adresse du bien">
                                    {address ?? missingValue}
                                </DetailRow>
                                <DetailRow label="Nombre de biens déclarés">
                                    {owner.property_count}
                                </DetailRow>
                            </dl>
                            {(owner.phone || owner.email) && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {owner.phone && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                            >
                                                <a href={`tel:${phoneDigits}`}>
                                                    <Phone aria-hidden />
                                                    Appeler
                                                </a>
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                            >
                                                <a
                                                    href={`https://wa.me/${owner.phone.replace(/\D+/g, '')}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <MessageCircle
                                                        aria-hidden
                                                    />
                                                    WhatsApp
                                                </a>
                                            </Button>
                                        </>
                                    )}
                                    {owner.email && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                        >
                                            <a href={`mailto:${owner.email}`}>
                                                <Mail aria-hidden />
                                                Écrire
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            )}
                        </DetailSection>
                        <DetailSection title="Notes">
                            {owner.notes ? (
                                <p className="text-sm/6 whitespace-pre-line">
                                    {owner.notes}
                                </p>
                            ) : (
                                <p className="text-muted-foreground text-sm">
                                    Aucune note.
                                </p>
                            )}
                        </DetailSection>
                    </div>
                    <aside className="grid h-fit content-start gap-6 lg:sticky lg:top-6">
                        <section
                            aria-label="Lead"
                            className="bg-sidebar grid gap-3 rounded-xl border p-4"
                        >
                            <h2 className="flex items-center gap-2 text-base font-medium">
                                <Contact className="size-4" aria-hidden />
                                Lead
                            </h2>
                            {owner.lead ? (
                                <>
                                    <div className="grid gap-1 text-sm">
                                        <Link
                                            href={leadShow({
                                                lead: owner.lead.uuid,
                                            })}
                                            className="font-medium underline-offset-4 hover:underline"
                                        >
                                            Lead {owner.lead.reference}
                                        </Link>
                                        <span className="text-muted-foreground text-xs">
                                            {owner.lead.status_label}
                                        </span>
                                    </div>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        asChild
                                    >
                                        <Link
                                            href={leadShow({
                                                lead: owner.lead.uuid,
                                            })}
                                        >
                                            Ouvrir le lead
                                            <ArrowRight aria-hidden />
                                        </Link>
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <p className="text-muted-foreground text-sm">
                                        Aucun lead de gestion locative pour
                                        l’instant.
                                    </p>
                                    <Button
                                        size="sm"
                                        disabled={converting}
                                        onClick={convert}
                                    >
                                        Créer le lead
                                    </Button>
                                </>
                            )}
                        </section>

                        <section
                            aria-label="Biens"
                            className="bg-sidebar grid gap-3 rounded-xl border p-4"
                        >
                            <h2 className="flex items-center gap-2 text-base font-medium">
                                <House className="size-4" aria-hidden />
                                Biens
                                <Badge
                                    variant="secondary"
                                    className="tabular-nums"
                                >
                                    {properties.length}
                                </Badge>
                            </h2>
                            {properties.length > 0 ? (
                                <ul role="list" className="grid gap-2 text-sm">
                                    {properties.map((property) => (
                                        <li
                                            key={property.uuid}
                                            className="bg-background flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
                                        >
                                            <div className="grid min-w-0 gap-0.5">
                                                <Link
                                                    href={propertyShow({
                                                        property: property.uuid,
                                                    })}
                                                    className="truncate font-medium underline-offset-4 hover:underline"
                                                >
                                                    {property.label}
                                                </Link>
                                                <span className="text-muted-foreground truncate text-xs">
                                                    {formatAddress(property) ??
                                                        '—'}
                                                    {property.rent_cents !==
                                                        null &&
                                                        ` · ${formatMoney(property.rent_cents, property.currency)} / mois`}
                                                </span>
                                            </div>
                                            <span className="text-muted-foreground text-xs tabular-nums">
                                                {property.visits_count}{' '}
                                                visite(s)
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted-foreground text-sm">
                                    Aucun bien de l’annuaire rattaché à ce
                                    propriétaire.
                                </p>
                            )}
                        </section>
                    </aside>
                </div>
            </div>
            <OwnerDialog
                open={editing}
                onOpenChange={setEditing}
                statuses={statuses}
                owner={owner}
            />
        </>
    );
}

OwnerShow.layout = {
    breadcrumbs: [
        { title: 'Propriétaires', href: ownersIndex() },
        { title: 'Biens et propriétaires', href: ownersIndex() },
        { title: 'Fiche', href: '#' },
    ],
};
