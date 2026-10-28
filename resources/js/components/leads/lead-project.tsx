import { ChevronDown, Map } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { Fact } from '@/components/leads/lead-show-body';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { InlineField, type InlineValue } from '@/components/inline-field';
import { cn } from '@/lib/utils';

type Props = {
    /** Enregistre un champ modifié en place (`name` côté serveur). */
    onSave?: (name: string, value: InlineValue) => void;
    /** Nom du champ en cours d'enregistrement. */
    saving?: string | null;
    /** Le projet en une phrase (« Cherche un T2 meublé dans le 9e… »), null sans critère. */
    sentence: string | null;
    /** Les chiffres qu'on lit d'abord : offre, budget, arrivée, note. */
    highlights: Fact[];
    /** Les autres critères, en pastilles (type de bien, meublé, durée, garant, ville d'origine, source). */
    facts: Fact[];
    /** Note sur le projet, en citation sous les critères. */
    message?: string | null;
    /** Carte des arrondissements (lecture seule). */
    map: ReactNode;
};

const badgeTones = {
    default: '',
    warn: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    good: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
};

/**
 * Bloc « Projet » de la fiche lead : la phrase du projet, puis **une fiche à
 * filets** (libellé à gauche, valeur à droite, un filet entre les lignes,
 * comme les cartes « Coordonnées » des annuaires) des critères renseignés,
 * les quatre faits de tête d'abord, **chaque critère sur sa ligne, même
 * vide** : la valeur manquante est une étiquette « Non renseigné »
 * (demandé le 28 octobre 2026, à la place de la phrase « À compléter : … »
 * qui ne se voyait pas) ; la note du lead en citation, puis la carte des
 * arrondissements repliée.
 */
export function LeadProject({
    sentence,
    highlights,
    facts,
    message = null,
    map,
    onSave,
    saving = null,
}: Props) {
    const [mapOpen, setMapOpen] = useState(false);

    // Tous les critères, renseignés ou non : un critère vide garde sa
    // ligne, avec une étiquette « Non renseigné » à la place de la valeur,
    // pour qu'on voie d'un coup d'œil ce qui reste à demander au lead.
    const ordered = [...highlights, ...facts];
    const mapToggle = (
        <Collapsible
            open={mapOpen}
            onOpenChange={setMapOpen}
            className="grid gap-3"
        >
            <CollapsibleTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                >
                    <Map aria-hidden />
                    {mapOpen
                        ? 'Masquer la carte'
                        : 'Voir la carte des quartiers'}
                    <ChevronDown
                        aria-hidden
                        className={cn(
                            'transition-transform',
                            mapOpen && 'rotate-180',
                        )}
                    />
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>{map}</CollapsibleContent>
        </Collapsible>
    );

    return (
        <>
            {sentence && <p className="text-base/7 font-medium">{sentence}</p>}
            <dl className="divide-y text-sm">
                {ordered.map((fact) => (
                    <div
                        key={fact.label}
                        className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4"
                    >
                        <dt className="text-muted-foreground flex items-center gap-1.5">
                            {fact.icon}
                            {fact.label}
                        </dt>
                        <dd className="flex min-w-0 flex-wrap items-center gap-2 font-medium [overflow-wrap:anywhere]">
                            {/* Modifiable en place dès que la page sait enregistrer :
                                la valeur (ou « Non renseigné ») est un bouton qui
                                ouvre son contrôle à sa place (28 octobre 2026). */}
                            {onSave && fact.edit ? (
                                <InlineField
                                    label={fact.label}
                                    display={
                                        fact.empty ? (
                                            <Badge
                                                variant="outline"
                                                className="text-muted-foreground font-normal"
                                            >
                                                Non renseigné
                                            </Badge>
                                        ) : (
                                            fact.value
                                        )
                                    }
                                    edit={fact.edit}
                                    saving={saving === fact.edit.name}
                                    onSave={(value) =>
                                        onSave(fact.edit!.name, value)
                                    }
                                />
                            ) : fact.empty ? (
                                <Badge
                                    variant="outline"
                                    className="text-muted-foreground font-normal"
                                >
                                    Non renseigné
                                </Badge>
                            ) : (
                                fact.value
                            )}
                            {fact.badge && (
                                <Badge
                                    variant="secondary"
                                    className={cn(
                                        'font-medium tabular-nums',
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
            {message && (
                <blockquote className="text-muted-foreground border-l-2 pl-3 text-sm/6 whitespace-pre-line">
                    {message}
                </blockquote>
            )}
            {mapToggle}
        </>
    );
}
