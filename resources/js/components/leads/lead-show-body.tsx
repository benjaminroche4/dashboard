import {
    InlineField,
    type InlineEdit,
    type InlineValue,
} from '@/components/inline-field';
import { Link } from '@inertiajs/react';
import {
    BadgeCheck,
    ChevronDown,
    ClipboardList,
    Clock,
    FileSignature,
    Home,
    Pencil,
    Receipt,
    RefreshCw,
    UsersRound,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useStoredState } from '@/hooks/use-stored-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export type Fact = {
    label: string;
    value: ReactNode;
    icon?: ReactNode;
    /** Petit badge après la valeur (ex. compte à rebours d'arrivée). */
    badge?: string | null;
    /** Teinte du badge. */
    badgeTone?: 'default' | 'warn' | 'good';
    multiline?: boolean;
    /** Valeur absente (« Non renseigné »). */
    empty?: boolean;
    /** Modifiable en place : nom du champ côté serveur et son contrôle. */
    edit?: { name: string } & InlineEdit;
    /** Geste posé après la valeur (« Ajouter aux entreprises » à côté de la société). */
    after?: ReactNode;
};

type Props = {
    /** En-tête de la fiche : identité, statut, actions. Ouvre la colonne gauche. */
    header: ReactNode;
    /** Ce qui précède le dossier : alerte doublons, message d'arrivée, dernier appel. */
    before?: ReactNode;
    /** Coordonnées en section à part ; absentes quand l'en-tête les porte déjà. */
    contact?: Fact[];
    /** Enregistre un champ du contact modifié en place (`name` côté serveur). */
    onSaveField?: (name: string, value: InlineValue) => void;
    savingField?: string | null;
    /** Refus du serveur par champ (nom → message). */
    fieldErrors?: Record<string, string>;
    facts: Fact[];
    /** Rendu personnalisé de la section Projet (remplace les lignes et la carte). */
    project?: ReactNode;
    /** Titre de cette section (« Projet » par défaut, « Bien proposé » pour un propriétaire). */
    projectTitle?: string;
    /** Vrai quand `project` a du contenu même sans `facts` (bien proposé d'un propriétaire). */
    projectFilled?: boolean;
    message: string | null;
    /** Vrai quand `project` affiche déjà la note : pas de section « Note sur le projet » en plus. */
    projectHasMessage?: boolean;
    /** Les personnes du foyer (lead et seconde personne), avec leur nombre pour l'accordéon. */
    people?: ReactNode;
    peopleCount?: number;
    qualification: Fact[];
    /** Qualification modifiable en place (étoiles et note) ; remplace les lignes `qualification`. */
    qualificationEditor?: ReactNode;
    /** Responsable du lead : avatar, nom et menu d'attribution. */
    assign: ReactNode;
    /** Prochain recontact : canal, date, retard, planification. */
    recontact?: ReactNode;
    /** Appel vidéo programmé (date, lien Meet, compte rendu) : une étape de la frise. */
    visio?: ReactNode;
    /** Date du dernier contact, déjà formatée, ou « Jamais ». */
    lastContact: string;
    /** Marque le lead comme contacté maintenant. */
    onTouchContact?: () => void;
    touchingContact?: boolean;
    /** « Envoyer au lead » (et la proposition « Devis envoyé »). */
    send?: ReactNode;
    /** Bouton « Notes » qui ouvre le volet d'activité, avec le compte en pastille. */
    activity: ReactNode;
    /**
     * Page de modification, proposée à la place d'une section sans aucune
     * donnée (lead arrivé du site ou du téléphone, pas encore qualifié).
     */
    completeUrl?: string;
    /** Factures rattachées au lead, avec leur nombre pour l'accordéon. */
    invoices?: ReactNode;
    invoiceCount?: number;
    /** Devis rattachés au lead, avec leur nombre pour l'accordéon. */
    quotes?: ReactNode;
    quoteCount?: number;
    /**
     * Préfixe `localStorage` (« lead.<uuid> ») sous lequel l'état plié ou
     * déplié de chaque accordéon survit au rechargement ; sans lui, l'état
     * repart du défaut à chaque montage.
     */
    storageKey?: string;
};

const badgeTones = {
    default: '',
    warn: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    good: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
};

/**
 * Lignes libellé au-dessus de la valeur : la colonne de gauche de la fiche
 * est étroite, un libellé à côté de la valeur tronquerait l'e-mail.
 * Exportée avec `Section`, `TitleIcon` et `TimelineDot` : la fiche d'un
 * agent (28 octobre 2026) suit le même moule que la fiche lead.
 */
export function Rows({
    facts,
    columns = 1,
    onSave,
    saving,
    errors = {},
}: {
    facts: Fact[];
    columns?: 1 | 2;
    /** Enregistre un champ modifié en place ; sans lui, lecture seule. */
    onSave?: (name: string, value: InlineValue) => void;
    saving?: string | null;
    errors?: Record<string, string>;
}) {
    return (
        <dl
            className={cn(
                'grid gap-3',
                columns === 2 && 'gap-x-6 sm:grid-cols-2',
            )}
        >
            {facts.map((fact) => (
                <div key={fact.label} className="grid min-w-0 gap-1.5 text-sm">
                    <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
                        {fact.icon}
                        {fact.label}
                    </dt>
                    <dd
                        className={cn(
                            'flex min-w-0 flex-wrap items-center gap-2 font-medium',
                            fact.multiline
                                ? 'whitespace-pre-line'
                                : '[overflow-wrap:anywhere]',
                        )}
                    >
                        {onSave && fact.edit ? (
                            /* La valeur est un bouton qui ouvre son contrôle à sa place. */
                            <InlineField
                                label={fact.label}
                                display={fact.value}
                                edit={fact.edit}
                                saving={saving === fact.edit.name}
                                error={errors[fact.edit.name]}
                                onSave={(value) =>
                                    onSave(fact.edit!.name, value)
                                }
                            />
                        ) : (
                            fact.value
                        )}
                        {fact.badge && (
                            <Badge
                                variant="secondary"
                                className={cn(
                                    'align-middle font-medium whitespace-normal tabular-nums',
                                    badgeTones[fact.badgeTone ?? 'default'],
                                )}
                            >
                                {fact.badge}
                            </Badge>
                        )}
                        {fact.after}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

/**
 * Fiche à filets : libellé à gauche sur 10 rem, valeur à droite, un filet
 * entre les lignes (le Projet d'un lead, le profil de matching d'un agent).
 * Une ligne vide garde sa place avec « Non renseigné », modifiable en place
 * dès que `onSave` est fourni.
 */
export function RuledRows({
    facts,
    onSave,
    saving = null,
    errors = {},
}: {
    facts: Fact[];
    onSave?: (name: string, value: InlineValue) => void;
    saving?: string | null;
    errors?: Record<string, string>;
}) {
    const missing = (
        <Badge variant="outline" className="text-muted-foreground font-normal">
            Non renseigné
        </Badge>
    );

    return (
        <dl className="divide-y text-sm">
            {facts.map((fact) => (
                <div
                    key={fact.label}
                    className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4"
                >
                    <dt className="text-muted-foreground flex min-w-0 items-center gap-1.5 [overflow-wrap:anywhere]">
                        {fact.icon}
                        {fact.label}
                    </dt>
                    <dd className="flex min-w-0 flex-wrap items-center gap-2 font-medium [overflow-wrap:anywhere]">
                        {onSave && fact.edit ? (
                            <InlineField
                                label={fact.label}
                                display={fact.empty ? missing : fact.value}
                                edit={fact.edit}
                                saving={saving === fact.edit.name}
                                error={errors[fact.edit.name]}
                                onSave={(value) =>
                                    onSave(fact.edit!.name, value)
                                }
                            />
                        ) : fact.empty ? (
                            missing
                        ) : (
                            fact.value
                        )}
                        {fact.badge && (
                            <Badge
                                variant="secondary"
                                className={cn(
                                    'font-medium whitespace-normal tabular-nums',
                                    badgeTones[fact.badgeTone ?? 'default'],
                                )}
                            >
                                {fact.badge}
                            </Badge>
                        )}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

/** Pictogramme d'un titre de section, dans une pastille grise discrète. */
export function TitleIcon({ icon: Icon }: { icon: typeof Home }) {
    return (
        <span
            aria-hidden
            className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-md"
        >
            <Icon className="size-4" />
        </span>
    );
}

/** Section sans cadre, séparée de la suivante par un filet. */
export function Section({
    title,
    icon,
    count,
    action,
    className,
    children,
}: {
    title: string;
    /** Pictogramme en pastille grise devant le titre. */
    icon?: typeof Home;
    /** Nombre d'éléments, en pastille à côté du titre (rien à zéro). */
    count?: number;
    action?: ReactNode;
    /** Filet sous la section (`border-b`) là où la colonne n'est pas en `divide-y`. */
    className?: string;
    children: ReactNode;
}) {
    return (
        <section
            aria-label={title}
            className={cn('grid gap-4 py-6 first:pt-0 last:pb-0', className)}
        >
            <header className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-base font-medium">
                    {icon && <TitleIcon icon={icon} />}
                    {title}
                    {count !== undefined && count > 0 && (
                        <Badge variant="secondary" className="tabular-nums">
                            {count}
                        </Badge>
                    )}
                </h2>
                {action}
            </header>
            {children}
        </section>
    );
}

/** Clé `localStorage` d'un accordéon de la fiche, ou rien sans préfixe. */
function foldKey(prefix: string | undefined, name: string): string | undefined {
    return prefix === undefined ? undefined : `${prefix}.fold.${name}`;
}

/** Groupe repliable à filet : intitulé, compte, chevron. */
export function Fold({
    title,
    icon,
    count,
    defaultOpen = false,
    storageKey,
    action,
    className,
    children,
}: {
    title: string;
    /** Pictogramme en pastille grise devant le titre. */
    icon?: typeof Home;
    count?: number;
    defaultOpen?: boolean;
    /** Clé `localStorage` qui mémorise l'état plié ou déplié (28 octobre 2026). */
    storageKey?: string;
    /** Bouton à droite du titre, hors du déclencheur (« Ajouter un interlocuteur »). */
    action?: ReactNode;
    /** Marges à rendre quand l'accordéon n'est pas un enfant direct de la colonne (carrousel). */
    className?: string;
    children: ReactNode;
}) {
    // Plié ou déplié à la main, l'accordéon le reste après un rechargement :
    // le défaut ne sert qu'à la première visite de la fiche.
    const [open, setOpen] = useStoredState(storageKey, defaultOpen);

    return (
        <section
            aria-label={title}
            className={cn('py-6 first:pt-0 last:pb-0', className)}
        >
            <Collapsible
                open={open}
                onOpenChange={setOpen}
                className="grid gap-4"
            >
                {/* Un seul déclencheur (titre et chevron) ; l'action se pose
                    par-dessus, juste avant le chevron, hors du bouton (un « + »
                    après le chevron pendait au bout de la ligne). */}
                <div className="relative flex items-center">
                    <CollapsibleTrigger className="flex w-full min-w-0 items-center justify-between gap-2 text-left">
                        <span
                            className={cn(
                                'flex min-w-0 items-center gap-2 text-base font-medium',
                                // Le titre s'arrête avant l'action posée par-dessus.
                                action && 'pr-9',
                            )}
                        >
                            {icon && <TitleIcon icon={icon} />}
                            {title}
                            {count !== undefined && count > 0 && (
                                <Badge
                                    variant="secondary"
                                    className="tabular-nums"
                                >
                                    {count}
                                </Badge>
                            )}
                        </span>
                        <ChevronDown
                            aria-hidden
                            className={cn(
                                'text-muted-foreground size-4 shrink-0 transition-transform',
                                open && 'rotate-180',
                            )}
                        />
                    </CollapsibleTrigger>
                    {action && (
                        <div className="absolute top-1/2 right-7 flex -translate-y-1/2 items-center gap-1">
                            {action}
                        </div>
                    )}
                </div>
                {/* Le contenu d'un bloc respire : ses éléments (phrase, lignes,
                    citation, carte) sont espacés comme les blocs entre eux. */}
                <CollapsibleContent className="grid gap-5">
                    {children}
                </CollapsibleContent>
            </Collapsible>
        </section>
    );
}

/**
 * Fiche lead en deux moitiés égales séparées d'un filet vertical (décision
 * du 27 octobre 2026). À gauche, **la personne et son suivi**, dans cet
 * ordre : l'en-tête (slot `header` : pastille, nom, référence, statut,
 * auteur, urgence, menu « ⋯ »), les coordonnées en lignes sous l'en-tête
 * (deux par ligne, sans carte), le suivi en **frise** (responsable et
 * « Mettre à jour » en tête, puis dernier contact, appel vidéo prévu s'il y en a un, et prochain
 * recontact le long d'un rail ; « Planifier » / « Reporter » programme
 * aussi l'appel vidéo quand le canal est la visio), l'assistant, « Envoyer au lead »
 * juste sous lui (slot `send`), puis le bouton « Notes » seul (plus de carte « Activité »),
 * puis le fil d'activité. À droite, **le projet** : le message d'arrivée,
 * le Projet, puis trois accordéons à filet : Qualification, Devis et
 * Factures (ouverts quand ils ont quelque chose). Documents et
 * partenaires vivent sur le dossier client, plus sur la fiche lead.
 */
/**
 * Point de la frise « Suivi par » : il se pose sur le rail à l'arrivée
 * (`animate-timeline-dot`, décalé d'une étape à l'autre pour lire la frise
 * de haut en bas), et rejoue quand ce qu'il date change (`replayKey`), par
 * exemple après « Mettre à jour » sur le dernier contact. La couleur du halo
 * suit celle du point (`currentColor`).
 */
export function TimelineDot({
    tone,
    step,
    replayKey,
}: {
    tone: 'past' | 'visio' | 'next';
    step: number;
    replayKey?: string;
}) {
    return (
        <span
            key={replayKey}
            aria-hidden
            data-testid="timeline-dot"
            data-tone={tone}
            style={{ animationDelay: `${step * 90}ms` }}
            className={cn(
                'ring-background animate-timeline-dot absolute top-1.5 -left-[1.5625rem] size-2.5 rounded-full ring-4 motion-reduce:animate-none',
                tone === 'past' &&
                    'bg-muted-foreground/40 text-muted-foreground',
                tone === 'visio' && 'bg-primary/60 text-primary',
                tone === 'next' && 'bg-primary text-primary',
            )}
        />
    );
}

export function LeadShowBody({
    header,
    before,
    contact,
    onSaveField,
    savingField = null,
    fieldErrors = {},
    facts,
    project,
    projectTitle = 'Projet',
    projectFilled = false,
    message,
    projectHasMessage = false,
    qualification,
    qualificationEditor,
    people,
    peopleCount = 0,
    assign,
    recontact,
    visio,
    lastContact,
    onTouchContact,
    touchingContact = false,
    send,
    activity,
    completeUrl,
    invoices,
    quotes,
    storageKey,
    quoteCount = 0,
    invoiceCount = 0,
}: Props) {
    const placeholder = (
        <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted-foreground text-sm">Non renseigné</p>
            {completeUrl && (
                <Button variant="outline" size="sm" asChild>
                    <Link href={completeUrl}>
                        <Pencil aria-hidden />
                        Compléter
                    </Link>
                </Button>
            )}
        </div>
    );
    // Les trois blocs commerciaux, dans l'ordre, pour les variantes.
    const touchButton = onTouchContact && (
        <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            disabled={touchingContact}
            onClick={onTouchContact}
        >
            {touchingContact ? <Spinner /> : <RefreshCw aria-hidden />}
            Mettre à jour
        </Button>
    );

    return (
        /* Le filet vertical part sous la marge haute de la page (2 rem sous
           l'en-tête, comme avant) et court jusqu'en bas : la grille remplit
           son conteneur et chaque colonne porte le padding bas que la page
           portait (demandé le 28 octobre 2026). */
        <div
            className="grid gap-8 lg:flex-1 lg:grid-cols-2 lg:gap-0 lg:divide-x"
            data-testid="lead-columns"
        >
            {/* Qui il est et qui s'en occupe : carte d'identité, coordonnées,
                suivi, assistant, activité. Collée sous l'en-tête (4 rem, son padding haut fait le reste)
                pendant que le projet défile ; plus haute que l'écran, elle
                défile dans sa propre hauteur (demandé le 28 octobre 2026).
                Le défilement rogne ce qui dépasse à gauche : les points de la
                frise débordent du rail de 0,6 rem, d'où la marge négative
                compensée par le même padding, qui ne déplace rien. */}
            <div
                className="grid content-start gap-6 lg:sticky lg:top-20 lg:-ml-3 lg:max-h-[calc(100dvh-5rem)] lg:self-start lg:overflow-y-auto lg:pr-8 lg:pb-8 lg:pl-3"
                data-testid="lead-left-column"
            >
                {header}
                {contact && (
                    /* Les coordonnées, sans carte : des lignes sous l'en-tête,
                       deux par ligne dès que la place le permet. */
                    <section
                        aria-label="Contact"
                        className="border-b pb-6"
                        data-testid="lead-contact"
                    >
                        {contact.length === 0 ? (
                            placeholder
                        ) : (
                            <Rows
                                facts={contact}
                                columns={2}
                                onSave={onSaveField}
                                saving={savingField}
                                errors={fieldErrors}
                            />
                        )}
                    </section>
                )}
                {/* Le suivi, aussi simple que le contact : trois faits en
                    lignes (responsable, dernier contact, prochain recontact)
                    et les deux actions côte à côte. */}
                {/* Le suivi, lu comme une frise : le responsable en tête,
                    puis du dernier contact (point gris) au prochain
                    recontact (point noir), et les deux actions côte à côte. */}
                <section
                    aria-label="Suivi par"
                    className="grid gap-4 border-b pb-6"
                    data-testid="lead-follow-up"
                >
                    <div className="flex items-center justify-between gap-4 text-sm">
                        {assign}
                        {touchButton}
                    </div>
                    {/* Rail aligné sur l'axe de la pastille du titre (14 px) :
                        les points ne débordent plus de la colonne. */}
                    <ol
                        className="relative ml-3.5 grid gap-4 border-l pl-5 text-sm"
                        data-testid="follow-up-rail"
                    >
                        <li className="relative">
                            <TimelineDot
                                tone="past"
                                step={0}
                                replayKey={lastContact}
                            />
                            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                                <Clock className="size-3.5" aria-hidden />
                                Dernier contact
                            </div>
                            <div className="font-medium">{lastContact}</div>
                        </li>
                        {visio && (
                            <li className="relative">
                                <TimelineDot tone="visio" step={1} />
                                {visio}
                            </li>
                        )}
                        {recontact && (
                            <li className="relative">
                                <TimelineDot tone="next" step={visio ? 2 : 1} />
                                {recontact}
                            </li>
                        )}
                    </ol>
                </section>
                {/* Les trois gestes (envoyer, notes, puis qualifier en
                    dernier : l'IA vient après le geste humain) forment une
                    seule pile serrée : espacés comme le reste de la colonne,
                    ils se lisaient comme trois blocs sans lien (28 octobre 2026). */}
                <div className="grid gap-2" data-testid="lead-actions">
                    {send}
                    {activity}
                </div>
            </div>
            {/* Ce qu'il cherche et ce qu'on en a fait : message d'arrivée,
                projet, qualification, puis commercial et partenaires. */}
            <div className="grid content-start gap-6 lg:pb-10 lg:pl-8">
                {before}
                {/* Un accordéon par bloc (retenu le 28 octobre 2026 parmi
                    vingt variantes) : Projet, Qualification, Devis, Factures.
                    Un bloc vide est replié, un bloc garni s'ouvre ; le Projet
                    se plie aussi, comme les autres (demandé le même jour).
                    Documents et Partenaires ne sont plus sur la fiche lead :
                    ils se gèrent sur le dossier client. */}
                <div className="divide-y">
                    <Fold
                        title={projectTitle}
                        icon={projectFilled ? Home : ClipboardList}
                        defaultOpen={facts.length > 0 || projectFilled}
                        storageKey={foldKey(storageKey, 'project')}
                    >
                        {/* Un rendu dédié (bien proposé) montre ses champs à
                            compléter même vides ; sans lui, une seule ligne. */}
                        {project ??
                            (facts.length === 0 && !projectFilled ? (
                                placeholder
                            ) : (
                                <Rows facts={facts} />
                            ))}
                    </Fold>
                    {message !== null && !projectHasMessage && (
                        <Section title="Note sur le projet">
                            <p className="text-sm/6 whitespace-pre-line">
                                {message}
                            </p>
                        </Section>
                    )}
                    {people && (
                        <Fold
                            title="Personnes"
                            icon={UsersRound}
                            count={peopleCount}
                            defaultOpen={peopleCount > 1}
                            storageKey={foldKey(storageKey, 'people')}
                        >
                            {people}
                        </Fold>
                    )}
                    <Fold
                        title="Qualification"
                        icon={BadgeCheck}
                        defaultOpen={
                            qualificationEditor !== undefined ||
                            qualification.length > 0
                        }
                        storageKey={foldKey(storageKey, 'qualification')}
                    >
                        {qualificationEditor ??
                            (qualification.length === 0 ? (
                                placeholder
                            ) : (
                                <Rows facts={qualification} />
                            ))}
                    </Fold>
                    {quotes && (
                        <Fold
                            title="Devis"
                            icon={FileSignature}
                            count={quoteCount}
                            defaultOpen={quoteCount > 0}
                            storageKey={foldKey(storageKey, 'quotes')}
                        >
                            {quotes}
                        </Fold>
                    )}
                    {invoices && (
                        <Fold
                            title="Factures"
                            icon={Receipt}
                            count={invoiceCount}
                            defaultOpen={invoiceCount > 0}
                            storageKey={foldKey(storageKey, 'invoices')}
                        >
                            {invoices}
                        </Fold>
                    )}
                </div>
            </div>
        </div>
    );
}
