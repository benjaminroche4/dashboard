import { Head, Link, router, usePage } from '@inertiajs/react';
import { Contact, Globe, Home, Mail, Phone, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { AddressMapButton } from '@/components/address-map-dialog';
import { CreatedBy } from '@/components/created-by';
import { FavoriteStar } from '@/components/favorite-star';
import type { InlineValue } from '@/components/inline-field';
import { Rows, Section, type Fact } from '@/components/leads/lead-show-body';
import { PartnerBilling } from '@/components/partners/partner-billing';
import { PartnerTypeBadge } from '@/components/partners/columns';
import {
    PartnerContacts,
    PartnerLeads,
} from '@/components/partners/partner-contacts';
import { PartnerDialog } from '@/components/partners/partner-dialog';
import {
    PartnerLogoMenuItem,
    PartnerLogoTile,
} from '@/components/partners/partner-logo-upload';
import { formatAddress } from '@/components/real-estate/columns';
import { missingValue } from '@/components/real-estate/detail-header';
import { DirectoryFollowUp } from '@/components/real-estate/directory-follow-up';
import { RealEstateRowActions } from '@/components/real-estate/real-estate-row-actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
    relationshipQualities,
    relationshipQualityTones,
    type RelationshipQualityValue,
} from '@/lib/relationship-quality';
import { notify } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
    contact as partnerContact,
    destroy as partnerDestroy,
    favorite as partnerFavorite,
    fields as partnerFields,
    index as partnersIndex,
    show as partnerShow,
} from '@/routes/partners';
import type {
    ContactHistoryEntry,
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
    /** Partenaires qui partagent l'e-mail ou le téléphone. */
    duplicates?: PartnerDuplicate[];
    /** Tous les échanges notés, pour « Voir l'historique ». */
    contacts?: ContactHistoryEntry[];
};

/** Valeur d'une ligne de contact : lien cliquable, texte, ou « Non renseigné ». */
function contactValue(
    value: string | null | undefined,
    href: string | null,
    external = false,
) {
    if (!value) {
        return missingValue;
    }

    return href ? (
        <a
            href={href}
            {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
            className="underline-offset-4 hover:underline"
        >
            {value}
        </a>
    ) : (
        value
    );
}

/**
 * Fiche d'un partenaire, **sur le moule des fiches agent et agence** (28
 * octobre 2026) : deux moitiés égales séparées d'un filet. À gauche, le
 * partenaire et la relation — l'alerte doublons, l'en-tête gris (pastille-logo,
 * nom, favori, type, qualité, interlocuteurs et dossiers, site, « Ajouté(e)
 * par », menu « ⋯ » qui porte Modifier et le retrait du logo), le contact en
 * lignes deux par deux modifiables en place (`partners.fields`) avec la carte
 * Google, puis la frise « Suivi et notes ». À
 * droite, ses interlocuteurs, ses dossiers, ses devis et factures.
 */
export default function PartnerShow({
    partner,
    types,
    quotes = [],
    invoices = [],
    can = { quotes: false, invoices: false },
    duplicates = [],
    contacts = [],
}: Props) {
    const [editing, setEditing] = useState(false);
    const [savingField, setSavingField] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const address = formatAddress(partner);
    const { features } = usePage().props;
    const addressAutocomplete = features.addressAutocomplete;
    const saveField = (name: string, value: InlineValue) => {
        setSavingField(name);
        setFieldErrors({});
        router.patch(
            partnerFields({ partner: partner.uuid }).url,
            // Un champ composé (l'adresse) envoie ses trois colonnes.
            value !== null && typeof value === 'object' && !Array.isArray(value)
                ? value
                : { [name]: value },
            {
                preserveScroll: true,
                onError: (errors) => {
                    const message =
                        Object.values(errors)[0] ??
                        'Le champ n’a pas pu être enregistré.';
                    setFieldErrors({ [name]: message });
                    notify.error('Modification refusée', message);
                },
                onFinish: () => setSavingField(null),
            },
        );
    };

    const contact: Fact[] = [
        {
            label: 'Téléphone',
            icon: <Phone className="size-3.5" aria-hidden />,
            value: contactValue(
                partner.phone,
                partner.phone
                    ? `tel:${partner.phone.replace(/\s+/g, '')}`
                    : null,
            ),
            edit: { name: 'phone', kind: 'text', value: partner.phone },
        },
        {
            label: 'E-mail',
            icon: <Mail className="size-3.5" aria-hidden />,
            value: contactValue(
                partner.email,
                partner.email ? `mailto:${partner.email}` : null,
            ),
            edit: { name: 'email', kind: 'text', value: partner.email },
        },
        {
            label: 'Site web',
            icon: <Globe className="size-3.5" aria-hidden />,
            value: contactValue(
                partner.website?.replace(/^https?:\/\//, ''),
                partner.website,
                true,
            ),
            edit: {
                name: 'website',
                kind: 'text',
                value: partner.website,
                placeholder: 'https://',
            },
        },
        {
            label: 'Qualité de la relation',
            value: partner.relationship_quality_label ?? missingValue,
            edit: {
                name: 'relationship_quality',
                kind: 'select',
                value: partner.relationship_quality,
                options: relationshipQualities.map((quality) => ({
                    ...quality,
                })),
            },
        },
        {
            label: 'Adresse',
            icon: <Home className="size-3.5" aria-hidden />,
            value: address ?? missingValue,
            // Une seule ligne cherchée dans Google Places : la suggestion
            // remplit rue, code postal et ville (28 octobre 2026, comme sur
            // les fiches agent et agence).
            edit: {
                name: 'address',
                kind: 'postal_address',
                street: partner.street,
                postalCode: partner.postal_code,
                city: partner.city,
                enabled: addressAutocomplete,
            },
        },
    ];

    const header = (
        <div
            className="bg-sidebar flex items-start justify-between gap-4 rounded-xl border p-4"
            data-testid="partner-header"
        >
            <div className="flex min-w-0 items-center gap-4">
                {/* La pastille est le bouton : logo, ou initiales, et au
                    survol un appareil photo pour en poser un. */}
                <PartnerLogoTile partner={partner} />
                <div className="min-w-0">
                    {/* L'étoile reste hors du titre : le nom accessible du <h1>
                        ne doit pas se terminer par « Favori ». */}
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="truncate text-lg font-medium">
                            {partner.name}
                        </h1>
                        <FavoriteStar favorite={partner.is_favorite} />
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
                    </div>
                    <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm">
                        <span className="tabular-nums">
                            {partner.contacts_count} interlocuteur(s) ·{' '}
                            {partner.leads_count} dossier(s)
                        </span>
                        {partner.website && (
                            <>
                                <span>·</span>
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
                            </>
                        )}
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                        <CreatedBy
                            name={partner.creator}
                            avatar={partner.creator_avatar}
                            date={partner.created_at}
                            verb="Ajouté(e) par"
                        />
                    </p>
                </div>
            </div>
            {/* Toutes les actions dans le menu « ⋯ », comme sur les autres fiches. */}
            <RealEstateRowActions
                triggerVariant="outline"
                favorite={{
                    active: partner.is_favorite,
                    url: partnerFavorite({ partner: partner.uuid }).url,
                }}
                name={partner.name}
                deleteUrl={partnerDestroy({ partner: partner.uuid }).url}
                deleteTitle={`Supprimer le partenaire ${partner.name} ?`}
                deleteDescription="Sa fiche sera effacée. Cette action est irréversible."
                onEdit={() => setEditing(true)}
                extra={<PartnerLogoMenuItem partner={partner} />}
            />
        </div>
    );

    return (
        <>
            <Head title={`Partenaire ${partner.name}`} />
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-8 pb-10 lg:pb-0">
                <div
                    className="grid gap-8 lg:flex-1 lg:grid-cols-2 lg:gap-0 lg:divide-x"
                    data-testid="partner-columns"
                >
                    {/* Le partenaire et la relation. */}
                    <div className="grid content-start gap-6 lg:sticky lg:top-20 lg:-ml-3 lg:max-h-[calc(100dvh-5rem)] lg:self-start lg:overflow-y-auto lg:pr-8 lg:pb-8 lg:pl-3">
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
                        {header}
                        <div>
                            <Section
                                title="Contact"
                                icon={Contact}
                                className="border-b pb-6 last:pb-6"
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
                                {/* Pas de carte dans le bloc : elle ne s'ouvre
                                    qu'au clic sur « Voir sur la carte » (28 octobre 2026). */}
                                <Rows
                                    facts={contact}
                                    columns={2}
                                    onSave={saveField}
                                    saving={savingField}
                                    errors={fieldErrors}
                                />
                            </Section>
                            <DirectoryFollowUp
                                name={partner.name}
                                lastContactedAt={partner.last_contacted_at}
                                touchUrl={
                                    partnerContact({ partner: partner.uuid })
                                        .url
                                }
                                contacts={contacts}
                                notes={partner.notes}
                                saving={savingField === 'notes'}
                                error={fieldErrors.notes}
                                onSaveNotes={(value) =>
                                    saveField('notes', value)
                                }
                            />
                        </div>
                    </div>
                    {/* Ses interlocuteurs, ses dossiers, ce qu'on lui a facturé. */}
                    <div className="grid min-w-0 content-start lg:pb-10 lg:pl-8">
                        <div className="divide-y">
                            <PartnerContacts
                                partnerUuid={partner.uuid}
                                contacts={partner.contacts}
                            />
                            <PartnerLeads
                                leads={partner.leads}
                                partner={partner}
                            />
                            <PartnerBilling
                                partnerUuid={partner.uuid}
                                quotes={quotes}
                                invoices={invoices}
                                can={can}
                            />
                        </div>
                    </div>
                </div>
            </div>
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
