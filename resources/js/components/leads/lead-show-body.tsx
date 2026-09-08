import { Link } from '@inertiajs/react';
import { Clock, Pencil, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
};

type Props = {
    contact: Fact[];
    facts: Fact[];
    /** Rendu personnalisé de la section Projet (remplace les lignes et la carte). */
    project?: ReactNode;
    /** Titre de cette section (« Projet » par défaut, « Bien proposé » pour un propriétaire). */
    projectTitle?: string;
    /** Vrai quand `project` a du contenu même sans `facts` (bien proposé d'un propriétaire). */
    projectFilled?: boolean;
    message: string | null;
    qualification: Fact[];
    /** Carte des arrondissements. */
    map: ReactNode;
    /** Responsable du lead : avatar, nom et menu d'attribution. */
    assign: ReactNode;
    /** Prochain recontact : canal, date, retard, planification. */
    recontact?: ReactNode;
    /** Carte « Agent en contact », onglet Partenaires. */
    agent?: ReactNode;
    /** Carte « Partenaires du dossier », onglet Partenaires. */
    partners?: ReactNode;
    /** Date du dernier contact, déjà formatée, ou « Jamais ». */
    lastContact: string;
    /** Marque le lead comme contacté maintenant. */
    onTouchContact?: () => void;
    touchingContact?: boolean;
    /** Actions vers le lead (ex. « Envoyer au lead »), sous le dernier contact. */
    actions?: ReactNode;
    /** Accès au fil d'activité (bouton ouvrant le volet). */
    activity: ReactNode;
    activityCount: number;
    /**
     * Page de modification, proposée à la place d'une section sans aucune
     * donnée (lead arrivé du site ou du téléphone, pas encore qualifié).
     */
    completeUrl?: string;
    /** Factures rattachées au lead, onglet Commercial. */
    invoices?: ReactNode;
    /** Devis rattachés au lead, onglet Commercial. */
    quotes?: ReactNode;
    documents?: ReactNode;
    /** Compteurs affichés sur les onglets Commercial et Partenaires. */
    counts?: { commercial: number; partners: number };
};

const badgeTones = {
    default: '',
    warn: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    good: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
};

/** Lignes libellé / valeur sur colonne fixe. */
function Rows({ facts }: { facts: Fact[] }) {
    return (
        <dl className="grid gap-3">
            {facts.map((fact) => (
                <div
                    key={fact.label}
                    className="grid grid-cols-1 gap-0.5 text-sm sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4"
                >
                    <dt className="text-muted-foreground flex items-center gap-1.5">
                        {fact.icon}
                        {fact.label}
                    </dt>
                    <dd
                        className={cn(
                            'min-w-0 font-medium',
                            fact.multiline ? 'whitespace-pre-line' : 'truncate',
                        )}
                    >
                        {fact.value}
                        {fact.badge && (
                            <Badge
                                variant="secondary"
                                className={cn(
                                    'ml-2 align-middle font-medium tabular-nums',
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

/** Section sans cadre, séparée de la suivante par un filet. */
function Section({
    title,
    action,
    children,
}: {
    title: string;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section
            aria-label={title}
            className="grid gap-3 py-8 first:pt-0 last:pb-0"
        >
            <header className="flex items-center justify-between gap-2">
                <h2 className="text-base font-medium">{title}</h2>
                {action}
            </header>
            {children}
        </section>
    );
}

/** Onglet avec compteur facultatif. */
function Tab({
    value,
    label,
    count,
}: {
    value: string;
    label: string;
    count?: number;
}) {
    return (
        <TabsTrigger value={value} className="flex-none px-3">
            {label}
            {count !== undefined && count > 0 && (
                <Badge
                    variant="secondary"
                    className="font-medium tabular-nums"
                    aria-label={`${count} ${count > 1 ? 'éléments' : 'élément'}`}
                >
                    {count}
                </Badge>
            )}
        </TabsTrigger>
    );
}

/**
 * Corps de la fiche lead : à gauche, trois onglets (« Dossier » : contact,
 * projet, note et qualification ; « Commercial » : devis, factures,
 * documents ; « Partenaires » : agent immobilier et partenaires), à droite la
 * carte du responsable (recontact, dernier contact, actions) puis celle du
 * fil d'activité. Les chiffres clés sont lus dans la section Projet.
 */
export function LeadShowBody({
    contact,
    facts,
    project,
    projectTitle = 'Projet',
    projectFilled = false,
    message,
    qualification,
    map,
    assign,
    recontact,
    agent,
    partners,
    lastContact,
    onTouchContact,
    touchingContact = false,
    actions,
    activity,
    activityCount,
    completeUrl,
    invoices,
    quotes,
    documents,
    counts,
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
    const hasCommercial = Boolean(invoices || quotes || documents);
    const hasPartners = Boolean(agent || partners);

    return (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Tabs defaultValue="dossier" className="gap-6">
                <TabsList variant="line" className="w-full border-b">
                    <Tab value="dossier" label="Dossier" />
                    {hasCommercial && (
                        <Tab
                            value="commercial"
                            label="Commercial"
                            count={counts?.commercial}
                        />
                    )}
                    {hasPartners && (
                        <Tab
                            value="partenaires"
                            label="Partenaires"
                            count={counts?.partners}
                        />
                    )}
                </TabsList>
                <TabsContent value="dossier" className="divide-y">
                    <Section title="Contact">
                        {contact.length === 0 ? (
                            placeholder
                        ) : (
                            <Rows facts={contact} />
                        )}
                    </Section>
                    <Section title={projectTitle}>
                        {facts.length === 0 && !projectFilled
                            ? placeholder
                            : (project ?? (
                                  <>
                                      <Rows facts={facts} />
                                      {map}
                                  </>
                              ))}
                    </Section>
                    {(message !== null || !completeUrl) && (
                        <Section title="Note sur le projet">
                            {message ? (
                                <p className="text-sm/6 whitespace-pre-line">
                                    {message}
                                </p>
                            ) : (
                                <p className="text-muted-foreground text-sm">
                                    Non renseignée
                                </p>
                            )}
                        </Section>
                    )}
                    <Section title="Qualification">
                        {qualification.length === 0 ? (
                            placeholder
                        ) : (
                            <Rows facts={qualification} />
                        )}
                    </Section>
                </TabsContent>
                {hasCommercial && (
                    <TabsContent value="commercial" className="divide-y">
                        {quotes && <Section title="Devis">{quotes}</Section>}
                        {invoices && (
                            <Section title="Factures">{invoices}</Section>
                        )}
                        {documents && (
                            <Section title="Documents">{documents}</Section>
                        )}
                    </TabsContent>
                )}
                {hasPartners && (
                    <TabsContent value="partenaires" className="grid gap-6">
                        {agent}
                        {partners}
                    </TabsContent>
                )}
            </Tabs>
            <aside className="grid h-fit content-start gap-6 lg:sticky lg:top-6">
                <section
                    aria-label="Responsable"
                    className="bg-sidebar grid gap-3 rounded-xl border p-4"
                >
                    <h2 className="text-base font-medium">Suivi par</h2>
                    {assign}
                    {recontact && (
                        <div className="border-t pt-3">{recontact}</div>
                    )}
                    <div className="flex items-end justify-between gap-3 border-t pt-3 text-sm">
                        <div className="grid min-w-0 gap-0.5">
                            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                                <Clock className="size-3.5" aria-hidden />
                                Dernier contact
                            </span>
                            <span className="truncate font-medium">
                                {lastContact}
                            </span>
                        </div>
                        {onTouchContact && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="shrink-0"
                                disabled={touchingContact}
                                onClick={onTouchContact}
                            >
                                {touchingContact ? (
                                    <Spinner />
                                ) : (
                                    <RefreshCw aria-hidden />
                                )}
                                Mettre à jour
                            </Button>
                        )}
                    </div>
                    {actions && <div className="border-t pt-3">{actions}</div>}
                </section>
                <section
                    aria-label="Activité"
                    className="bg-sidebar grid gap-2 rounded-xl border p-4"
                >
                    <header className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="flex items-center gap-2 text-base font-medium">
                            Activité
                            <Badge
                                variant="secondary"
                                className="font-medium tabular-nums"
                                aria-label={`${activityCount} ${activityCount > 1 ? 'entrées' : 'entrée'}`}
                            >
                                {activityCount}
                            </Badge>
                        </h2>
                    </header>
                    {activity}
                </section>
            </aside>
        </div>
    );
}
