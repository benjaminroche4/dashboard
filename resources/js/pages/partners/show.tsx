import { Head, Link } from '@inertiajs/react';
import { Globe, Send, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { ActivityFeed } from '@/components/activity/activity-feed';
import { AddressMapButton } from '@/components/address-map-dialog';
import { PartnerBilling } from '@/components/partners/partner-billing';
import { PartnerTypeBadge } from '@/components/partners/columns';
import {
    PartnerContacts,
    PartnerLeads,
} from '@/components/partners/partner-contacts';
import { PartnerDialog } from '@/components/partners/partner-dialog';
import {
    PartnerWelcomeDialog,
    welcomeRecipients,
} from '@/components/partners/partner-welcome-dialog';
import { formatAddress } from '@/components/real-estate/columns';
import {
    DetailHeader,
    DetailSection,
    missingValue,
} from '@/components/real-estate/detail-header';
import { DirectoryRelationCard } from '@/components/real-estate/directory-relation-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    relationshipQualityTones,
    type RelationshipQualityValue,
} from '@/lib/relationship-quality';
import { cn } from '@/lib/utils';
import {
    contact as partnerContact,
    destroy as partnerDestroy,
    favorite as partnerFavorite,
    index as partnersIndex,
    show as partnerShow,
} from '@/routes/partners';
import type {
    Activity,
    LeadInvoice,
    LeadQuote,
    PartnerAbilities,
    PartnerDetail,
    PartnerDuplicate,
    PartnerTypeOption,
} from '@/types';

type Props = {
    partner: PartnerDetail;
    types: PartnerTypeOption[];
    /** Historique commercial : ce qu'on a devisé et facturé au partenaire. */
    quotes?: LeadQuote[];
    invoices?: LeadInvoice[];
    /** Droits du membre sur les devis et les factures. */
    can?: PartnerAbilities;
    /** Carte statique de l'adresse, null sans clé Maps Static dédiée. */
    mapUrl?: string | null;
    /** Partenaires qui partagent l'e-mail ou le téléphone. */
    duplicates?: PartnerDuplicate[];
    /** Journal : les dernières actions du backoffice sur ce partenaire. */
    activities?: Activity[];
};

export default function PartnerShow({
    partner,
    types,
    quotes = [],
    invoices = [],
    can = { quotes: false, invoices: false },
    mapUrl = null,
    duplicates = [],
    activities = [],
}: Props) {
    const [editing, setEditing] = useState(false);
    const [welcoming, setWelcoming] = useState(false);
    // Le partenaire et ses interlocuteurs : les seules adresses possibles.
    const welcomeTo = welcomeRecipients(partner, partner.contacts);
    const address = formatAddress(partner);

    return (
        <>
            <Head title={`Partenaire ${partner.name}`} />
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-10">
                <DetailHeader
                    name={partner.name}
                    subtitle={
                        <>
                            <PartnerTypeBadge
                                type={partner.type}
                                label={partner.type_label}
                            />
                            {partner.relationship_quality_label && (
                                <Badge
                                    variant="secondary"
                                    className={cn(
                                        'font-medium',
                                        relationshipQualityTones[
                                            partner.relationship_quality as RelationshipQualityValue
                                        ],
                                    )}
                                >
                                    {partner.relationship_quality_label}
                                </Badge>
                            )}
                            <span className="tabular-nums">
                                {partner.contacts_count} interlocuteur(s) ·{' '}
                                {partner.leads_count} dossier(s)
                            </span>
                            {partner.website && (
                                <a
                                    href={partner.website}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                                >
                                    <Globe className="size-3.5" aria-hidden />
                                    {partner.website.replace(
                                        /^https?:\/\//,
                                        '',
                                    )}
                                </a>
                            )}
                        </>
                    }
                    creator={partner.creator}
                    creatorAvatar={partner.creator_avatar}
                    createdAt={partner.created_at}
                    onEdit={() => setEditing(true)}
                    deleteUrl={partnerDestroy({ partner: partner.uuid }).url}
                    deleteTitle={`Supprimer le partenaire ${partner.name} ?`}
                    deleteDescription="Sa fiche sera effacée. Cette action est irréversible."
                    tone="bg-muted text-muted-foreground"
                    favorite={{
                        active: partner.is_favorite,
                        url: partnerFavorite({ partner: partner.uuid }).url,
                    }}
                />

                {/* Même découpe qu'une facture ou un devis : le document à gauche,
                    les actions et les liens dans une colonne collante à droite. */}

                {/* Même découpe qu'une facture ou un devis : le document à gauche,
                    les actions et les liens dans une colonne collante à droite. */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="flex flex-col gap-6">
                        {duplicates.length > 0 && (
                            <Alert variant="warning">
                                <TriangleAlert aria-hidden />
                                <AlertTitle>
                                    {duplicates.length > 1
                                        ? 'D’autres partenaires partagent ce contact'
                                        : 'Un autre partenaire partage ce contact'}
                                </AlertTitle>
                                <AlertDescription>
                                    <ul role="list" className="grid gap-0.5">
                                        {duplicates.map((duplicate) => (
                                            <li key={duplicate.uuid}>
                                                <Link
                                                    href={partnerShow({
                                                        partner: duplicate.uuid,
                                                    })}
                                                    className="font-medium underline-offset-4 hover:underline"
                                                >
                                                    {duplicate.name}
                                                </Link>
                                                <span className="text-xs opacity-80">
                                                    {' · '}
                                                    {duplicate.type_label}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </AlertDescription>
                            </Alert>
                        )}
                        <DetailSection
                            title="Coordonnées"
                            action={
                                <AddressMapButton
                                    place={{
                                        name: partner.name,
                                        address,
                                        street: partner.street,
                                        latitude: partner.latitude,
                                        longitude: partner.longitude,
                                    }}
                                />
                            }
                        >
                            <div className="grid gap-4">
                                {mapUrl && (
                                    <img
                                        src={mapUrl}
                                        alt={`Carte de ${address ?? partner.name}`}
                                        loading="lazy"
                                        className="h-40 w-full rounded-lg border object-cover"
                                    />
                                )}
                                <dl className="divide-border grid divide-y text-sm">
                                    {[
                                        {
                                            label: 'Téléphone',
                                            value: partner.phone,
                                            href: partner.phone
                                                ? `tel:${partner.phone.replace(/\s+/g, '')}`
                                                : null,
                                        },
                                        {
                                            label: 'E-mail',
                                            value: partner.email,
                                            href: partner.email
                                                ? `mailto:${partner.email}`
                                                : null,
                                        },
                                        {
                                            label: 'Site web',
                                            value: partner.website?.replace(
                                                /^https?:\/\//,
                                                '',
                                            ),
                                            href: partner.website,
                                            external: true,
                                        },
                                        { label: 'Adresse', value: address },
                                    ].map((row) => (
                                        <div
                                            key={row.label}
                                            className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4"
                                        >
                                            <dt className="text-muted-foreground">
                                                {row.label}
                                            </dt>
                                            <dd className="break-words">
                                                {row.value ? (
                                                    row.href ? (
                                                        <a
                                                            href={row.href}
                                                            {...(row.external
                                                                ? {
                                                                      target: '_blank',
                                                                      rel: 'noreferrer',
                                                                  }
                                                                : {})}
                                                            className="underline-offset-4 hover:underline"
                                                        >
                                                            {row.value}
                                                        </a>
                                                    ) : (
                                                        row.value
                                                    )
                                                ) : (
                                                    missingValue
                                                )}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        </DetailSection>
                        <PartnerContacts
                            partnerUuid={partner.uuid}
                            contacts={partner.contacts}
                        />
                    </div>
                    <aside className="grid h-fit content-start gap-6 lg:sticky lg:top-6">
                        <DirectoryRelationCard
                            lastContactedAt={partner.last_contacted_at}
                            touchUrl={
                                partnerContact({ partner: partner.uuid }).url
                            }
                            notes={partner.notes}
                            extraAction={
                                welcomeTo.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setWelcoming(true)}
                                    >
                                        <Send aria-hidden />
                                        Renvoyer la bienvenue
                                    </Button>
                                )
                            }
                        />
                        <PartnerLeads
                            leads={partner.leads}
                            partner={partner}
                            roles={partner.roles}
                        />
                        <PartnerBilling
                            partnerUuid={partner.uuid}
                            quotes={quotes}
                            invoices={invoices}
                            can={can}
                        />
                        {activities.length > 0 && (
                            <ActivityFeed
                                groups={[
                                    {
                                        label: 'Dernières actions',
                                        items: activities,
                                    },
                                ]}
                                collapseAfter={5}
                            />
                        )}
                    </aside>
                </div>
            </div>
            <PartnerWelcomeDialog
                partnerUuid={partner.uuid}
                recipients={welcomeTo}
                open={welcoming}
                onOpenChange={setWelcoming}
            />
            <PartnerDialog
                open={editing}
                onOpenChange={setEditing}
                types={types}
                partner={partner}
            />
        </>
    );
}

PartnerShow.layout = {
    breadcrumbs: [
        { title: 'Partenaires', href: partnersIndex() },
        { title: 'Détail', href: '#' },
    ],
};
