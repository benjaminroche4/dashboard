import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Building2,
    Contact,
    Globe,
    Home,
    Mail,
    Phone,
    Plus,
    Search,
    Target,
    Users,
} from 'lucide-react';
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures';
import { useState, type ReactNode } from 'react';
import { AddressMapButton } from '@/components/address-map-dialog';
import { CountryFlag } from '@/components/country-flag';
import { CreatedBy } from '@/components/created-by';
import { FavoriteMenu } from '@/components/favorite-menu';
import { FavoriteStar } from '@/components/favorite-star';
import type { InlineValue } from '@/components/inline-field';
import { initials, memberTone } from '@/components/leads/lead-assign-menu';
import {
    Fold,
    Rows,
    RuledRows,
    Section,
    type Fact,
} from '@/components/leads/lead-show-body';
import { PropertyThumb } from '@/components/properties/property-thumb';
import { AgencyDialog } from '@/components/real-estate/agency-dialog';
import {
    AgencyLogoMenuItem,
    AgencyLogoTile,
} from '@/components/real-estate/agency-logo-upload';
import { AgentDialog } from '@/components/real-estate/agent-dialog';
import { formatAddress } from '@/components/real-estate/columns';
import { missingValue } from '@/components/real-estate/detail-header';
import { DirectoryFollowUp } from '@/components/real-estate/directory-follow-up';
import { RealEstateRowActions } from '@/components/real-estate/real-estate-row-actions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel';
import { Input } from '@/components/ui/input';
import { districtLabel, rentRange, yesNo } from '@/lib/agency-profile';
import { parisFormat } from '@/lib/datetime';
import { formatMoney } from '@/lib/format';
import { agencySpecialtyIcons, spokenLanguageFlags } from '@/lib/profile-pills';
import { notify } from '@/lib/toast';
import {
    destroy as agencyDestroy,
    favorite as agencyFavorite,
    fields as agencyFields,
    index as agenciesIndex,
    touch as agencyTouch,
} from '@/routes/agencies';
import {
    favorite as agentFavorite,
    index as agentsIndex,
    show as agentShow,
} from '@/routes/agents';
import { show as propertyShow } from '@/routes/properties';
import type {
    AgencyDetail,
    ContactHistoryEntry,
    ProfileOptions,
} from '@/types';

/** Au-delà de ce nombre d'agents, la carte propose une recherche. */
const AGENT_SEARCH_FROM = 6;

type Props = {
    agency: AgencyDetail;
    /** Carte statique de l'adresse, null sans clé Maps Static dédiée. */
    mapUrl?: string | null;
    /** Tous les échanges notés, pour « Voir l'historique ». */
    contacts?: ContactHistoryEntry[];
    /** Listes du profil (spécialités, langues, mandats). */
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

/** Oui / Non / on ne sait pas, pour les réponses tri-état du profil. */
const yesNoOptions = [
    { value: '1', label: 'Oui' },
    { value: '0', label: 'Non' },
];

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
 * Fiche d'une agence, **sur le moule de la fiche agent** (28 octobre 2026) :
 * deux moitiés égales séparées d'un filet. À gauche, l'agence et sa
 * relation — l'en-tête sur fond gris (pastille, nom, favori, site, « Ajouté(e)
 * par », menu « ⋯ » qui porte Modifier), le contact en lignes deux par deux,
 * puis la frise « Suivi et notes ». À droite, ses agents, le profil de
 * matching en fiche à filets et les biens visités. **Tout ce qui se lit se
 * modifie en place** (`agencies.fields`) ; le dialogue « Modifier » reste
 * pour le nom.
 */
export default function AgencyShow({
    agency,
    contacts = [],
    profileOptions = emptyOptions,
}: Props) {
    const { features } = usePage().props;
    const addressAutocomplete = features.addressAutocomplete;
    const [editing, setEditing] = useState(false);
    const [addingAgent, setAddingAgent] = useState(false);
    const [agentQuery, setAgentQuery] = useState('');
    const [savingField, setSavingField] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const needle = agentQuery.trim().toLowerCase();
    const shownAgents =
        needle === ''
            ? agency.agents
            : agency.agents.filter((agent) =>
                  [agent.name, agent.position]
                      .filter(Boolean)
                      .some((field) =>
                          String(field).toLowerCase().includes(needle),
                      ),
              );
    const address = formatAddress(agency);
    const saveField = (name: string, value: InlineValue) => {
        setSavingField(name);
        setFieldErrors({});
        router.patch(
            agencyFields({ agency: agency.uuid }).url,
            // Un champ composé (l'adresse) envoie ses trois colonnes.
            value !== null && typeof value === 'object' && !Array.isArray(value)
                ? value
                : {
                      [name]:
                          // Les réponses tri-état partent en booléen, « Non renseigné » en null.
                          name.startsWith('accepts_')
                              ? value === null
                                  ? null
                                  : value === '1'
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

    const contact: Fact[] = [
        {
            label: 'Téléphone',
            icon: <Phone className="size-3.5" aria-hidden />,
            value: contactValue(
                agency.phone,
                agency.phone ? `tel:${agency.phone.replace(/\s+/g, '')}` : null,
            ),
            edit: { name: 'phone', kind: 'text', value: agency.phone },
        },
        {
            label: 'E-mail',
            icon: <Mail className="size-3.5" aria-hidden />,
            value: contactValue(
                agency.email,
                agency.email ? `mailto:${agency.email}` : null,
            ),
            edit: { name: 'email', kind: 'text', value: agency.email },
        },
        {
            label: 'Site web',
            icon: <Globe className="size-3.5" aria-hidden />,
            value: contactValue(
                agency.website?.replace(/^https?:\/\//, ''),
                agency.website,
                true,
            ),
            edit: {
                name: 'website',
                kind: 'text',
                value: agency.website,
                placeholder: 'https://',
            },
        },
        {
            label: 'Adresse',
            icon: <Home className="size-3.5" aria-hidden />,
            value: address ?? missingValue,
            // Une seule ligne cherchée dans Google Places : la suggestion
            // remplit rue, code postal et ville (28 octobre 2026, à la place
            // de trois lignes, comme sur la fiche agent).
            edit: {
                name: 'address',
                kind: 'postal_address',
                street: agency.street,
                postalCode: agency.postal_code,
                city: agency.city,
                enabled: addressAutocomplete,
            },
        },
    ];

    // Pastilles du profil : un drapeau devant chaque langue, un pictogramme
    // devant chaque spécialité, le libellé venant des options du serveur.
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
    const districts = agency.districts ?? [];
    const specialties = agency.specialties ?? [];
    const languages = agency.languages ?? [];
    const mandates = agency.mandate_types ?? [];
    const rents = rentRange(
        agency.rent_min_cents ?? null,
        agency.rent_max_cents ?? null,
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
        {
            label: 'Mandats',
            value: pills(mandates, profileOptions.mandateTypes),
            empty: mandates.length === 0,
            edit: {
                name: 'mandate_types',
                kind: 'multi',
                value: mandates,
                options: profileOptions.mandateTypes,
            },
        },
        {
            label: 'Loyer minimum',
            value: agency.rent_min_cents
                ? `${formatMoney(agency.rent_min_cents)} / mois`
                : missingValue,
            empty: !agency.rent_min_cents,
            edit: {
                name: 'rent_min_cents',
                kind: 'money',
                value: agency.rent_min_cents ?? null,
                suffix: '€ / mois',
            },
        },
        {
            label: 'Loyer maximum',
            value: agency.rent_max_cents
                ? `${formatMoney(agency.rent_max_cents)} / mois`
                : missingValue,
            empty: !agency.rent_max_cents,
            badge: rents,
            edit: {
                name: 'rent_max_cents',
                kind: 'money',
                value: agency.rent_max_cents ?? null,
                suffix: '€ / mois',
            },
        },
        {
            label: 'Frais d’agence',
            value: agency.fee_note ?? missingValue,
            empty: !agency.fee_note,
            edit: {
                name: 'fee_note',
                kind: 'text',
                value: agency.fee_note ?? null,
            },
        },
        {
            label: 'Garantme',
            value: yesNo(agency.accepts_garantme) ?? missingValue,
            empty: agency.accepts_garantme == null,
            edit: {
                name: 'accepts_garantme',
                kind: 'select',
                value:
                    agency.accepts_garantme == null
                        ? null
                        : agency.accepts_garantme
                          ? '1'
                          : '0',
                options: yesNoOptions,
            },
        },
        {
            label: 'Dossiers étrangers',
            value: yesNo(agency.accepts_foreign_files) ?? missingValue,
            empty: agency.accepts_foreign_files == null,
            edit: {
                name: 'accepts_foreign_files',
                kind: 'select',
                value:
                    agency.accepts_foreign_files == null
                        ? null
                        : agency.accepts_foreign_files
                          ? '1'
                          : '0',
                options: yesNoOptions,
            },
        },
    ];

    const header = (
        <div
            className="bg-sidebar flex items-start justify-between gap-4 rounded-xl border p-4"
            data-testid="agency-header"
        >
            <div className="flex min-w-0 items-center gap-4">
                {/* La pastille est le bouton : logo, ou initiales, et au
                    survol un appareil photo pour en poser un. */}
                <AgencyLogoTile agency={agency} />
                <div className="min-w-0">
                    {/* L'étoile reste hors du titre : le nom accessible du <h1>
                        ne doit pas se terminer par « Favori ». */}
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="truncate text-lg font-medium">
                            {agency.name}
                        </h1>
                        <FavoriteStar favorite={agency.is_favorite} />
                    </div>
                    <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm">
                        <span className="inline-flex items-center gap-1">
                            <Users className="size-3.5" aria-hidden />
                            {agency.agents.length} agent
                            {agency.agents.length > 1 ? 's' : ''}
                        </span>
                        {agency.website && (
                            <>
                                <span>·</span>
                                <a
                                    href={agency.website}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                                >
                                    <Globe className="size-3.5" aria-hidden />
                                    {agency.website.replace(/^https?:\/\//, '')}
                                </a>
                            </>
                        )}
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                        <CreatedBy
                            name={agency.creator}
                            avatar={agency.creator_avatar}
                            date={agency.created_at}
                            verb="Ajouté(e) par"
                        />
                    </p>
                </div>
            </div>
            {/* Toutes les actions dans le menu « ⋯ », comme sur la fiche agent. */}
            <RealEstateRowActions
                triggerVariant="outline"
                favorite={{
                    active: agency.is_favorite,
                    url: agencyFavorite({ agency: agency.uuid }).url,
                }}
                name={agency.name}
                deleteUrl={agencyDestroy({ agency: agency.uuid }).url}
                deleteTitle={`Supprimer l’agence ${agency.name} ?`}
                deleteDescription="Ses agents sont conservés, sans agence. Cette action est irréversible."
                onEdit={() => setEditing(true)}
                extra={<AgencyLogoMenuItem agency={agency} />}
            />
        </div>
    );

    return (
        <>
            <Head title={`Agence ${agency.name}`} />
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-8 pb-10 lg:pb-0">
                <div
                    className="grid gap-8 lg:flex-1 lg:grid-cols-2 lg:gap-0 lg:divide-x"
                    data-testid="agency-columns"
                >
                    {/* L'agence, ses agents, la relation. */}
                    <div className="grid min-w-0 content-start gap-6 lg:sticky lg:top-20 lg:-ml-3 lg:max-h-[calc(100dvh-5rem)] lg:self-start lg:overflow-y-auto lg:pr-8 lg:pb-8 lg:pl-3">
                        {header}
                        <div>
                            <Section
                                title="Contact"
                                icon={Contact}
                                className="border-b pb-6 last:pb-6"
                                action={
                                    <AddressMapButton
                                        place={{
                                            name: agency.name,
                                            address,
                                            street: agency.street,
                                            latitude: agency.latitude,
                                            longitude: agency.longitude,
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
                            <DirectoryFollowUp
                                name={agency.name}
                                lastContactedAt={agency.last_contacted_at}
                                touchUrl={
                                    agencyTouch({ agency: agency.uuid }).url
                                }
                                contacts={contacts}
                                notes={agency.notes}
                                saving={savingField === 'notes'}
                                error={fieldErrors.notes}
                                onSaveNotes={(value) =>
                                    saveField('notes', value)
                                }
                            />
                        </div>
                    </div>
                    {/* Ce que le matching sait de l'agence, et ce qu'on a visité avec elle. */}
                    <div className="grid min-w-0 content-start lg:pb-10 lg:pl-8">
                        <div className="divide-y">
                            <Fold
                                title="Agents"
                                icon={Building2}
                                count={agency.agents.length}
                                defaultOpen={agency.agents.length > 0}
                                storageKey={`agency.${agency.uuid}.agents`}
                                action={
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:text-foreground size-7 rounded-full"
                                        aria-label="Ajouter un agent"
                                        title="Ajouter un agent"
                                        onClick={() => setAddingAgent(true)}
                                    >
                                        <Plus aria-hidden />
                                    </Button>
                                }
                            >
                                {/* Une agence peut aligner cent agents : au-delà
                                    d'une poignée, on cherche plutôt qu'on déroule. */}
                                {agency.agents.length > AGENT_SEARCH_FROM && (
                                    <div className="relative">
                                        <Search
                                            aria-hidden
                                            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                                        />
                                        <Input
                                            type="search"
                                            value={agentQuery}
                                            onChange={(event) =>
                                                setAgentQuery(
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Rechercher un agent (nom, fonction)…"
                                            aria-label="Rechercher un agent"
                                            className="pl-9"
                                        />
                                    </div>
                                )}
                                {agency.agents.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">
                                        Aucun agent rattaché pour le moment.
                                    </p>
                                ) : shownAgents.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">
                                        Aucun agent ne correspond à «{' '}
                                        {agentQuery} ».
                                    </p>
                                ) : (
                                    /* Chaque agent en carte grise, comme les leads d'un agent. */
                                    <ul role="list" className="grid gap-2">
                                        {shownAgents.map((agent) => (
                                            <li
                                                key={agent.id}
                                                className="bg-sidebar grid gap-2 rounded-lg border p-3 text-sm"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <Avatar className="size-8 shrink-0">
                                                        <AvatarFallback
                                                            className={`text-xs ${memberTone(agent.id)}`}
                                                        >
                                                            {initials(
                                                                agent.name,
                                                            )}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="grid min-w-0 flex-1 gap-0.5">
                                                        <span className="flex min-w-0 items-center gap-2">
                                                            <Link
                                                                href={agentShow(
                                                                    {
                                                                        agent: agent.uuid,
                                                                    },
                                                                )}
                                                                className="truncate font-medium underline-offset-4 hover:underline"
                                                            >
                                                                {agent.name}
                                                            </Link>
                                                            <FavoriteStar
                                                                favorite={
                                                                    agent.is_favorite
                                                                }
                                                            />
                                                            {agent.is_primary && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="shrink-0 border-emerald-200 bg-emerald-50 font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                                                                >
                                                                    Principal
                                                                </Badge>
                                                            )}
                                                        </span>
                                                        {agent.position && (
                                                            <span className="text-muted-foreground truncate text-xs">
                                                                {agent.position}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <FavoriteMenu
                                                        name={agent.name}
                                                        favorite={{
                                                            active: agent.is_favorite,
                                                            url: agentFavorite({
                                                                agent: agent.uuid,
                                                            }).url,
                                                        }}
                                                    />
                                                </div>
                                                {(agent.phone ||
                                                    agent.email) && (
                                                    <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
                                                        {agent.phone && (
                                                            <a
                                                                href={`tel:${agent.phone.replace(/\s+/g, '')}`}
                                                                className="hover:text-foreground inline-flex items-center gap-1.5"
                                                            >
                                                                <Phone
                                                                    className="size-3.5 shrink-0"
                                                                    aria-hidden
                                                                />
                                                                <span className="tabular-nums">
                                                                    {
                                                                        agent.phone
                                                                    }
                                                                </span>
                                                            </a>
                                                        )}
                                                        {agent.email && (
                                                            <a
                                                                href={`mailto:${agent.email}`}
                                                                className="hover:text-foreground inline-flex items-center gap-1.5"
                                                            >
                                                                <Mail
                                                                    className="size-3.5 shrink-0"
                                                                    aria-hidden
                                                                />
                                                                <span className="truncate">
                                                                    {
                                                                        agent.email
                                                                    }
                                                                </span>
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Fold>
                            <Fold
                                title="Profil de matching"
                                icon={Target}
                                defaultOpen
                                storageKey={`agency.${agency.uuid}.profile`}
                            >
                                <RuledRows
                                    facts={profile}
                                    onSave={saveField}
                                    saving={savingField}
                                    errors={fieldErrors}
                                />
                                {!agency.has_profile && (
                                    <p className="text-muted-foreground text-sm">
                                        Rien de renseigné pour l’instant : le
                                        matching ne s’appuie que sur ses biens
                                        et ses visites. Complétez ligne à ligne,
                                        rien n’est exigé à la création.
                                    </p>
                                )}
                            </Fold>
                            {/* Les biens visités défilent de gauche à droite, en
                                boucle, au doigt comme au trackpad (demandé le
                                28 octobre 2026) ; les flèches vivent à côté du
                                compte, dans l'en-tête de la section. */}
                            <Carousel
                                opts={{ align: 'start', loop: true }}
                                plugins={[WheelGesturesPlugin()]}
                                className="min-w-0"
                                aria-label="Biens visités, en carrousel"
                            >
                                <Fold
                                    title="Biens visités"
                                    icon={Home}
                                    count={agency.properties.length}
                                    defaultOpen={agency.properties.length > 0}
                                    storageKey={`agency.${agency.uuid}.properties`}
                                    // Enveloppé par le carrousel, l'accordéon est
                                    // « premier » de son parent : on lui rend la
                                    // marge haute que `divide-y` attend.
                                    className="pt-6 first:pt-6"
                                    action={
                                        agency.properties.length > 1 ? (
                                            <span className="flex items-center gap-2">
                                                <CarouselPrevious className="static size-8 translate-y-0" />
                                                <CarouselNext className="static size-8 translate-y-0" />
                                            </span>
                                        ) : undefined
                                    }
                                >
                                    {agency.properties.length === 0 ? (
                                        <p className="text-muted-foreground text-sm">
                                            Aucun bien n’a encore été visité
                                            avec cette agence.
                                        </p>
                                    ) : (
                                        <CarouselContent className="-ml-2 cursor-grab active:cursor-grabbing">
                                            {agency.properties.map(
                                                (property) => (
                                                    <CarouselItem
                                                        key={property.uuid}
                                                        className="basis-[15.5rem] pl-2"
                                                    >
                                                        <article className="bg-sidebar grid h-full gap-2 rounded-lg border p-3 text-sm select-none">
                                                            {property.photo ? (
                                                                <img
                                                                    src={
                                                                        property.photo
                                                                    }
                                                                    alt={`Photo de ${property.label}`}
                                                                    loading="lazy"
                                                                    draggable={
                                                                        false
                                                                    }
                                                                    className="aspect-[3/2] w-full rounded-md border object-cover"
                                                                />
                                                            ) : (
                                                                <PropertyThumb
                                                                    photo={null}
                                                                    label={
                                                                        property.label
                                                                    }
                                                                    className="aspect-[3/2] h-auto w-full"
                                                                />
                                                            )}
                                                            <span className="flex items-baseline justify-between gap-2">
                                                                <Link
                                                                    href={propertyShow(
                                                                        {
                                                                            property:
                                                                                property.uuid,
                                                                        },
                                                                    )}
                                                                    className="truncate font-medium underline-offset-4 hover:underline"
                                                                >
                                                                    {
                                                                        property.label
                                                                    }
                                                                </Link>
                                                                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                                                                    {
                                                                        property.visits_count
                                                                    }{' '}
                                                                    visite
                                                                    {property.visits_count >
                                                                    1
                                                                        ? 's'
                                                                        : ''}
                                                                </span>
                                                            </span>
                                                            <span className="text-muted-foreground truncate text-xs">
                                                                Dernière :{' '}
                                                                {visitDate.format(
                                                                    new Date(
                                                                        property.last_visit_at,
                                                                    ),
                                                                )}{' '}
                                                                ·{' '}
                                                                {
                                                                    property.last_visit_status
                                                                }
                                                                {property.agent &&
                                                                    ` · ${property.agent}`}
                                                            </span>
                                                        </article>
                                                    </CarouselItem>
                                                ),
                                            )}
                                        </CarouselContent>
                                    )}
                                </Fold>
                            </Carousel>
                        </div>
                    </div>
                </div>
            </div>
            <AgencyDialog
                open={editing}
                onOpenChange={setEditing}
                agency={agency}
            />
            <AgentDialog
                open={addingAgent}
                onOpenChange={setAddingAgent}
                agencies={[
                    { id: agency.id, uuid: agency.uuid, name: agency.name },
                ]}
                defaultAgencyId={agency.id}
            />
        </>
    );
}

AgencyShow.layout = {
    breadcrumbs: [
        { title: 'Agents immobiliers', href: agentsIndex() },
        { title: 'Agences', href: agenciesIndex() },
        { title: 'Détail', href: '#' },
    ],
};
