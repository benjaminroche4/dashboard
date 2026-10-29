import { AgentLeadRow } from '@/components/real-estate/agent-lead-link';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Building2,
    CalendarCheck,
    Contact,
    Mail,
    MapPin,
    Phone,
    Target,
    Users,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { AddressMapButton } from '@/components/address-map-dialog';
import { CreatedBy } from '@/components/created-by';
import { FavoriteStar } from '@/components/favorite-star';
import { memberTone } from '@/components/leads/lead-assign-menu';
import type { InlineValue } from '@/components/inline-field';
import {
    Fold,
    Rows,
    RuledRows,
    Section,
    type Fact,
} from '@/components/leads/lead-show-body';
import { districtLabel } from '@/lib/agency-profile';
import { agencySpecialtyIcons, spokenLanguageFlags } from '@/lib/profile-pills';
import { CountryFlag } from '@/components/country-flag';
import { agentPositions } from '@/lib/agent-positions';
import { notify } from '@/lib/toast';
import { AgentDialog } from '@/components/real-estate/agent-dialog';
import { DirectoryFollowUp } from '@/components/real-estate/directory-follow-up';
import {
    AgentPhotoMenuItem,
    AgentPhotoTile,
} from '@/components/real-estate/agent-photo-upload';
import { formatAddress } from '@/components/real-estate/columns';
import { missingValue } from '@/components/real-estate/detail-header';
import { RealEstateRowActions } from '@/components/real-estate/real-estate-row-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { parisFormat } from '@/lib/datetime';
import {
    relationshipQualities,
    relationshipQualityTones,
    type RelationshipQualityValue,
} from '@/lib/relationship-quality';
import { cn } from '@/lib/utils';
import { show as agencyShow } from '@/routes/agencies';
import {
    destroy as agentDestroy,
    favorite as agentFavorite,
    fields as agentFields,
    index as agentsIndex,
    touch as agentTouch,
} from '@/routes/agents';
import type {
    AgencyOption,
    Agent,
    AgentAgencyCard,
    ContactHistoryEntry,
    ProfileOptions,
} from '@/types';

type Props = {
    agent: Agent;
    /** Fiche de son agence, null pour un indépendant. */
    agency: AgentAgencyCard | null;
    agencies: AgencyOption[];
    /** Carte statique de l'adresse, repli sans clé navigateur. */
    mapUrl?: string | null;
    /** Tous les échanges notés, pour « Voir l'historique ». */
    contacts?: ContactHistoryEntry[];
    profileOptions?: ProfileOptions;
};

const emptyOptions: ProfileOptions = {
    specialties: [],
    languages: [],
    mandateTypes: [],
};

const visitDate = parisFormat({
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

/** Valeur d'une ligne de contact : lien cliquable, texte, ou « Non renseigné ». */
function contactValue(value: string | null, href: string | null) {
    if (!value) {
        return missingValue;
    }

    return href ? (
        <a href={href} className="underline-offset-4 hover:underline">
            {value}
        </a>
    ) : (
        value
    );
}

/**
 * Fiche d'un agent immobilier, **sur le moule de la fiche lead** (demandé le
 * 28 octobre 2026 : les cartes grises en deux colonnes inégales se lisaient
 * mal) : deux moitiés égales séparées d'un filet. À gauche, la personne et
 * son suivi — l'en-tête sur fond gris (pastille-photo cliquable, nom, favori, fonction,
 * agence, qualité de la relation, menu « ⋯ » qui porte Modifier), le contact
 * en lignes deux par deux, puis la frise « Suivi et notes » (dernier
 * échange, « Échange noté », notes repliables). À droite, son agence, son
 * profil de matching, ses leads et clients, puis les dernières actions.
 * **Tout ce qui se lit se modifie en place** (`InlineField`, route
 * `agents.fields`) : téléphone, e-mail, fonction, qualité de la relation,
 * agence, adresse d'un indépendant, notes, et le profil de matching
 * (quartiers, spécialités, langues) en fiche à filets ; le dialogue
 * « Modifier » reste pour le nom.
 */
export default function AgentShow({
    agent,
    agency,
    agencies,
    contacts = [],
    profileOptions = emptyOptions,
}: Props) {
    const { features } = usePage().props;
    const addressAutocomplete = features.addressAutocomplete;
    const [editing, setEditing] = useState(false);
    const [savingField, setSavingField] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const saveField = (name: string, value: InlineValue) => {
        setSavingField(name);
        setFieldErrors({});
        router.patch(
            agentFields({ agent: agent.uuid }).url,
            // Un champ composé (l'adresse) envoie ses trois colonnes.
            value !== null && typeof value === 'object' && !Array.isArray(value)
                ? value
                : {
                      [name]:
                          // L'agence part en entier, comme le dialogue l'envoie.
                          name === 'agency_id' && typeof value === 'string'
                              ? Number(value)
                              : value,
                  },
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
    const agencyAddress = agency ? formatAddress(agency) : null;
    // Un agent rattaché travaille à l'adresse de son agence : c'est celle-là
    // qu'on montre, la sienne n'étant renseignée que pour un indépendant.
    const address = agency ? agencyAddress : formatAddress(agent);
    const place = agency ?? agent;

    const contact: Fact[] = [
        {
            label: 'Téléphone',
            icon: <Phone className="size-3.5" aria-hidden />,
            value: contactValue(
                agent.phone,
                agent.phone ? `tel:${agent.phone.replace(/\s+/g, '')}` : null,
            ),
            edit: { name: 'phone', kind: 'text', value: agent.phone },
        },
        {
            label: 'E-mail',
            icon: <Mail className="size-3.5" aria-hidden />,
            value: contactValue(
                agent.email,
                agent.email ? `mailto:${agent.email}` : null,
            ),
            edit: { name: 'email', kind: 'text', value: agent.email },
        },
        {
            label: 'Fonction',
            value: agent.position ?? missingValue,
            edit: {
                name: 'position',
                kind: 'select',
                value: agent.position_value,
                options: agentPositions.map((position) => ({ ...position })),
            },
        },
        {
            label: 'Qualité de la relation',
            value: agent.relationship_quality_label ?? missingValue,
            edit: {
                name: 'relationship_quality',
                kind: 'select',
                value: agent.relationship_quality,
                options: relationshipQualities.map((quality) => ({
                    ...quality,
                })),
            },
        },
        {
            label: 'Agence',
            icon: <Building2 className="size-3.5" aria-hidden />,
            value: agent.agency?.name ?? 'Indépendant',
            // Une liste avec recherche : l'annuaire des agences se compte en
            // centaines (demandé le 28 octobre 2026) ; l'adresse aide à
            // distinguer deux agences du même réseau.
            edit: {
                name: 'agency_id',
                kind: 'search',
                value: agent.agency ? String(agent.agency.id) : null,
                options: agencies.map((option) => ({
                    value: String(option.id),
                    label: option.name,
                    hint: option.address ?? null,
                })),
                emptyLabel: 'Indépendant',
                searchPlaceholder: 'Rechercher une agence…',
            },
        },
        // Un agent rattaché travaille à l'adresse de son agence (lecture) ;
        // seul un indépendant saisit la sienne, en une ligne.
        ...(agency
            ? [
                  {
                      label: 'Adresse de l’agence',
                      value: address ?? missingValue,
                  },
              ]
            : [
                  {
                      label: 'Adresse',
                      icon: <MapPin className="size-3.5" aria-hidden />,
                      value: address ?? missingValue,
                      // Une seule ligne cherchée dans Google Places : la
                      // suggestion remplit rue, code postal et ville
                      // (28 octobre 2026, à la place de trois lignes).
                      edit: {
                          name: 'address',
                          kind: 'postal_address' as const,
                          street: agent.street,
                          postalCode: agent.postal_code,
                          city: agent.city,
                          enabled: addressAutocomplete,
                      },
                  },
              ]),
        {
            label: 'Visites avec cet agent',
            icon: <CalendarCheck className="size-3.5" aria-hidden />,
            value:
                agent.visits_count > 0
                    ? `${agent.visits_count} visite(s)${
                          agent.last_visit_at
                              ? ` · dernière le ${visitDate.format(new Date(agent.last_visit_at))}`
                              : ''
                      }`
                    : missingValue,
        },
    ];

    // Pastilles du profil : un drapeau devant chaque langue, un pictogramme
    // devant chaque spécialité (demandé le 28 octobre 2026), le libellé venant
    // des options du serveur.
    const pills = (
        values: string[],
        options: { value: string; label: string }[] = [],
        leading?: (value: string) => ReactNode,
    ) => (
        <span className="flex flex-wrap gap-1">
            {values.map((value) => (
                <Badge key={value} variant="secondary" className="font-normal">
                    {leading?.(value)}
                    {options.find((option) => option.value === value)?.label ??
                        value}
                </Badge>
            ))}
        </span>
    );
    const districts = agent.districts ?? [];
    const specialties = agent.specialties ?? [];
    const languages = agent.languages ?? [];
    const hasProfile = [districts, specialties, languages].some(
        (list) => list.length > 0,
    );
    const profile: Fact[] = [
        {
            label: 'Quartiers',
            value: pills(
                districts.map(String),
                districts.map((district) => ({
                    value: String(district),
                    label: districtLabel(district),
                })),
            ),
            empty: districts.length === 0,
            edit: { name: 'districts', kind: 'districts', value: districts },
        },
        {
            label: 'Spécialités',
            value: pills(specialties, profileOptions.specialties, (value) => {
                const Icon = agencySpecialtyIcons[value];

                return Icon ? <Icon className="size-3" aria-hidden /> : null;
            }),
            empty: specialties.length === 0,
            edit: {
                name: 'specialties',
                kind: 'multi',
                value: specialties,
                options: profileOptions.specialties,
            },
        },
        {
            label: 'Langues',
            value: pills(languages, profileOptions.languages, (value) => (
                <CountryFlag
                    code={spokenLanguageFlags[value]}
                    className="size-3.5"
                />
            )),
            empty: languages.length === 0,
            edit: {
                name: 'languages',
                kind: 'multi',
                value: languages,
                options: profileOptions.languages,
            },
        },
    ];

    const header = (
        <div
            className="bg-sidebar flex items-start justify-between gap-4 rounded-xl border p-4"
            data-testid="agent-header"
        >
            <div className="flex min-w-0 items-center gap-4">
                {/* La pastille est le bouton : au survol, un appareil photo
                    dit qu'on peut poser une photo (28 octobre 2026). */}
                <AgentPhotoTile
                    agent={agent}
                    className={memberTone(agent.id)}
                />
                <div className="min-w-0">
                    {/* L'étoile reste hors du titre : le nom accessible du <h1>
                        ne doit pas se terminer par « Favori ». */}
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="truncate text-lg font-medium">
                            {agent.name}
                        </h1>
                        <FavoriteStar favorite={agent.is_favorite} />
                        {agent.relationship_quality_label && (
                            <Badge
                                variant="secondary"
                                className={cn(
                                    'font-medium',
                                    relationshipQualityTones[
                                        agent.relationship_quality as RelationshipQualityValue
                                    ],
                                )}
                            >
                                {agent.relationship_quality_label}
                            </Badge>
                        )}
                    </div>
                    <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm">
                        {agent.position && <span>{agent.position}</span>}
                        {agent.position && <span>·</span>}
                        {agent.agency ? (
                            <Link
                                href={agencyShow({
                                    agency: agent.agency.uuid,
                                })}
                                className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                            >
                                <Building2 className="size-3.5" aria-hidden />
                                {agent.agency.name}
                            </Link>
                        ) : (
                            <Badge variant="secondary">Indépendant</Badge>
                        )}
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                        <CreatedBy
                            name={agent.creator}
                            avatar={agent.creator_avatar}
                            date={agent.created_at}
                            verb="Ajouté(e) par"
                        />
                    </p>
                </div>
            </div>
            {/* Toutes les actions dans le menu « ⋯ », comme sur la fiche lead. */}
            <RealEstateRowActions
                triggerVariant="outline"
                favorite={{
                    active: agent.is_favorite,
                    url: agentFavorite({ agent: agent.uuid }).url,
                }}
                name={agent.name}
                deleteUrl={agentDestroy({ agent: agent.uuid }).url}
                deleteTitle={`Supprimer l’agent ${agent.name} ?`}
                deleteDescription="Sa fiche sera effacée et les leads qu'il suivait n'auront plus d'agent. Cette action est irréversible."
                onEdit={() => setEditing(true)}
                extra={<AgentPhotoMenuItem agent={agent} />}
            />
        </div>
    );

    return (
        <>
            <Head title={`Agent ${agent.name}`} />
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-8 pb-10 lg:pb-0">
                <div
                    className="grid gap-8 lg:flex-1 lg:grid-cols-2 lg:gap-0 lg:divide-x"
                    data-testid="agent-columns"
                >
                    {/* Qui il est et le suivi de la relation. */}
                    <div className="grid min-w-0 content-start gap-6 lg:sticky lg:top-20 lg:-ml-3 lg:max-h-[calc(100dvh-5rem)] lg:self-start lg:overflow-y-auto lg:pr-8 lg:pb-8 lg:pl-3">
                        {header}
                        <div>
                            <Section
                                title="Contact"
                                className="border-b pb-6 last:pb-6"
                                icon={Contact}
                                action={
                                    <AddressMapButton
                                        place={{
                                            name: agent.name,
                                            address,
                                            street: place.street,
                                            latitude: place.latitude,
                                            longitude: place.longitude,
                                        }}
                                    />
                                }
                            >
                                {/* Pas de carte dans le bloc : elle s'ouvre
                                    par « Voir sur la carte » (28 octobre 2026). */}
                                <Rows
                                    facts={contact}
                                    columns={2}
                                    onSave={saveField}
                                    saving={savingField}
                                    errors={fieldErrors}
                                />
                            </Section>
                            {/* Le suivi en frise, comme « Suivi par » d'un lead :
                            le dernier échange sur le rail, le bouton qui note
                            celui du jour, et les notes libres dessous. */}
                            <DirectoryFollowUp
                                name={agent.name}
                                lastContactedAt={agent.last_contacted_at}
                                touchUrl={agentTouch({ agent: agent.uuid }).url}
                                contacts={contacts}
                                notes={agent.notes}
                                saving={savingField === 'notes'}
                                error={fieldErrors.notes}
                                onSaveNotes={(value) =>
                                    saveField('notes', value)
                                }
                            />
                        </div>
                    </div>
                    {/* Son agence, son profil, ses leads, ce qui s'est passé. */}
                    <div className="grid min-w-0 content-start lg:pb-10 lg:pl-8">
                        <div className="divide-y">
                            {agency && (
                                <Section title="Agence" icon={Building2}>
                                    <div className="grid gap-1 text-sm">
                                        <Link
                                            href={agencyShow({
                                                agency: agency.uuid,
                                            })}
                                            className="font-medium underline-offset-4 hover:underline"
                                        >
                                            {agency.name}
                                        </Link>
                                        {agencyAddress && (
                                            <span className="text-muted-foreground">
                                                {agencyAddress}
                                            </span>
                                        )}
                                        <span className="text-muted-foreground text-xs">
                                            {agency.agents_count} agent(s)
                                        </span>
                                    </div>
                                    {/* Plus de raccourcis téléphone, e-mail, site : ils
                                        se lisent sur la fiche de l'agence (28 octobre 2026). */}
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            asChild
                                        >
                                            <Link
                                                href={agencyShow({
                                                    agency: agency.uuid,
                                                })}
                                            >
                                                Voir la fiche de l’agence
                                                <ArrowRight aria-hidden />
                                            </Link>
                                        </Button>
                                    </div>
                                </Section>
                            )}
                            {/* Le profil de matching en fiche à filets, chaque
                                ligne modifiable en place, comme le Projet d'un
                                lead ; vide, « Non renseigné » invite à compléter. */}
                            <Fold
                                title="Profil de matching"
                                icon={Target}
                                defaultOpen
                                storageKey={`agent.${agent.uuid}.profile`}
                            >
                                <RuledRows
                                    facts={profile}
                                    onSave={saveField}
                                    saving={savingField}
                                    errors={fieldErrors}
                                />
                                {!hasProfile && (
                                    <p className="text-muted-foreground text-sm">
                                        Rien de propre à cet agent : le profil
                                        de son agence sert au matching.
                                    </p>
                                )}
                            </Fold>
                            <Fold
                                title="Leads et clients"
                                icon={Users}
                                count={agent.leads.length}
                                defaultOpen={agent.leads.length > 0}
                                storageKey={`agent.${agent.uuid}.leads`}
                            >
                                {agent.leads.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">
                                        Aucun lead ni dossier client ne lui est
                                        rattaché. Choisissez-le dans la carte «
                                        Agent en contact » d’une fiche lead.
                                    </p>
                                ) : (
                                    /* Chaque lead en carte grise (le sous-bloc
                                       du backoffice), demandé le 28 octobre 2026. */
                                    <ul role="list" className="grid gap-2">
                                        {agent.leads.map((lead) => (
                                            <li
                                                key={lead.uuid}
                                                className="bg-sidebar rounded-lg border p-3 text-sm"
                                            >
                                                <AgentLeadRow lead={lead} />
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Fold>
                        </div>
                    </div>
                </div>
            </div>
            <AgentDialog
                open={editing}
                onOpenChange={setEditing}
                agencies={agencies}
                agent={agent}
            />
        </>
    );
}

AgentShow.layout = {
    breadcrumbs: [
        { title: 'Agents immobiliers', href: agentsIndex() },
        { title: 'Agents', href: agentsIndex() },
        { title: 'Détail', href: '#' },
    ],
};
