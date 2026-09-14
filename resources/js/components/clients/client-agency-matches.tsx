import { Link, router, usePage } from '@inertiajs/react';
import {
    Building2,
    Mail,
    Phone,
    Search,
    Send,
    Sparkles,
    UserCheck,
} from 'lucide-react';
import { useState } from 'react';
import { AiBadge } from '@/components/ai-badge';
import { DiscoverAgenciesDialog } from '@/components/clients/discover-agencies-dialog';
import { SendHousingSearchDialog } from '@/components/clients/send-housing-search-dialog';
import { DetailSection } from '@/components/real-estate/detail-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { askAssistant } from '@/lib/assistant-request';
import { show as agencyShow } from '@/routes/agencies';
import { show as agentShow } from '@/routes/agents';
import { explain } from '@/routes/clients/agencies';
import { agent as leadAgentRoute } from '@/routes/leads';
import type { ClientAgentExplanation, ClientAgentSuggestion } from '@/types';

const fitLabels: Record<ClientAgentExplanation['fit'], string> = {
    strong: 'À contacter en premier',
    good: 'À contacter',
    weak: 'En réserve',
};

const fitTones: Record<ClientAgentExplanation['fit'], string> = {
    strong: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
    good: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    weak: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400',
};

/** Suggestions dans l'ordre de l'assistant quand il a parlé, sinon celui du score. */
export function orderSuggestions(
    suggestions: ClientAgentSuggestion[],
    ranking: string[],
): ClientAgentSuggestion[] {
    if (ranking.length === 0) {
        return suggestions;
    }
    const rank = (key: string) =>
        ranking.includes(key) ? ranking.indexOf(key) : 99;

    return [...suggestions].sort((a, b) => rank(a.key) - rank(b.key));
}

type Props = {
    clientUuid: string;
    /** Agent immobilier déjà choisi sur le dossier (id), pour ne pas le reproposer. */
    currentAgentId: number | null;
    districts: number[];
    suggestions: ClientAgentSuggestion[];
};

/**
 * Carte « Agences à contacter » de l'onglet Partenaires : les agences (et
 * agents) que le score à points place en tête pour ce dossier, avec les
 * raisons en clair, le meilleur agent à appeler, l'envoi de la recherche, et
 * l'affinage par l'assistant. « Trouver d'autres agences » cherche sur Google
 * celles qui manquent à l'annuaire.
 */
export function ClientAgencyMatches({
    clientUuid,
    currentAgentId,
    districts,
    suggestions,
}: Props) {
    const assistantEnabled = usePage().props.features?.assistant ?? false;
    const [explaining, setExplaining] = useState(false);
    const [explainError, setExplainError] = useState<string | null>(null);
    const [explanations, setExplanations] = useState<
        Record<string, ClientAgentExplanation>
    >({});
    const [ranking, setRanking] = useState<string[]>([]);
    const [sending, setSending] = useState<ClientAgentSuggestion | null>(null);
    const [discovering, setDiscovering] = useState(false);
    const [choosing, setChoosing] = useState<number | null>(null);

    const refine = async () => {
        setExplaining(true);
        setExplainError(null);
        try {
            const data = await askAssistant<{
                ranking: string[];
                explanations: ClientAgentExplanation[];
            }>(explain({ lead: clientUuid }).url);
            setRanking(data.ranking);
            setExplanations(
                Object.fromEntries(data.explanations.map((e) => [e.key, e])),
            );
        } catch (error) {
            setExplainError(
                error instanceof Error
                    ? error.message
                    : 'L’assistant n’a pas répondu.',
            );
        } finally {
            setExplaining(false);
        }
    };

    const choose = (agentId: number) => {
        setChoosing(agentId);
        router.patch(
            leadAgentRoute({ lead: clientUuid }).url,
            { agent_id: agentId },
            { preserveScroll: true, onFinish: () => setChoosing(null) },
        );
    };

    const ordered = orderSuggestions(suggestions, ranking);

    return (
        <>
            <DetailSection
                title="Agences à contacter"
                icon={Building2}
                count={suggestions.length > 0 ? suggestions.length : undefined}
                action={
                    <span className="flex flex-wrap gap-2">
                        {assistantEnabled && suggestions.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={explaining}
                                onClick={() => void refine()}
                            >
                                {explaining ? (
                                    <Spinner />
                                ) : (
                                    <Sparkles aria-hidden />
                                )}
                                {ranking.length > 0
                                    ? 'Affiner à nouveau'
                                    : 'Affiner avec l’IA'}
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDiscovering(true)}
                        >
                            <Search aria-hidden />
                            Trouver d’autres agences
                        </Button>
                    </span>
                }
            >
                <p className="text-muted-foreground text-xs">
                    D’après les quartiers visés, le budget, le type de bien, la
                    langue et le dossier du client, croisés avec les biens, les
                    visites et les résultats de chaque agent de l’annuaire.
                </p>
                {explainError && (
                    <p role="alert" className="text-destructive text-sm">
                        {explainError}
                    </p>
                )}
                {suggestions.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        Aucune agence de l’annuaire ne ressort pour ce dossier :
                        renseignez les quartiers visés, ou cherchez d’autres
                        agences.
                    </p>
                ) : (
                    <ol role="list" className="grid gap-3">
                        {ordered.map((suggestion, index) => {
                            const explanation = explanations[suggestion.key];
                            const best = suggestion.best_agent;
                            const isCurrent =
                                best !== null && best.id === currentAgentId;

                            return (
                                <li
                                    key={suggestion.key}
                                    className="bg-background grid gap-2 rounded-lg border p-3 text-sm"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <span className="flex min-w-0 items-center gap-2">
                                            <span className="bg-muted text-muted-foreground grid size-6 shrink-0 place-items-center rounded-full text-xs font-medium tabular-nums">
                                                {index + 1}
                                            </span>
                                            {suggestion.agency ? (
                                                <Link
                                                    href={agencyShow({
                                                        agency: suggestion
                                                            .agency.uuid,
                                                    })}
                                                    className="truncate font-medium underline-offset-4 hover:underline"
                                                >
                                                    {suggestion.agency.name}
                                                </Link>
                                            ) : best ? (
                                                <Link
                                                    href={agentShow({
                                                        agent: best.uuid,
                                                    })}
                                                    className="truncate font-medium underline-offset-4 hover:underline"
                                                >
                                                    {best.name}
                                                </Link>
                                            ) : null}
                                            {suggestion.agency?.city && (
                                                <span className="text-muted-foreground shrink-0 text-xs">
                                                    {
                                                        suggestion.agency
                                                            .postal_code
                                                    }{' '}
                                                    {suggestion.agency.city}
                                                </span>
                                            )}
                                            {!suggestion.agency && (
                                                <Badge
                                                    variant="outline"
                                                    className="shrink-0"
                                                >
                                                    Indépendant
                                                </Badge>
                                            )}
                                        </span>
                                        <span
                                            className="text-muted-foreground shrink-0 text-xs tabular-nums"
                                            title="Score à points"
                                        >
                                            {suggestion.score} pts
                                        </span>
                                    </div>
                                    <ul
                                        role="list"
                                        className="flex flex-wrap gap-1"
                                        aria-label="Pourquoi"
                                    >
                                        {suggestion.reasons.map((reason) => (
                                            <li key={reason}>
                                                <Badge
                                                    variant="outline"
                                                    className="border-transparent bg-green-100 font-medium text-green-900 dark:bg-green-950 dark:text-green-200"
                                                >
                                                    {reason}
                                                </Badge>
                                            </li>
                                        ))}
                                    </ul>
                                    {explanation && (
                                        <p className="flex flex-wrap items-center gap-2 text-xs">
                                            <AiBadge />
                                            <Badge
                                                variant="secondary"
                                                className={`font-medium ${fitTones[explanation.fit]}`}
                                            >
                                                {fitLabels[explanation.fit]}
                                            </Badge>
                                            <span className="text-muted-foreground">
                                                {explanation.reason}
                                            </span>
                                        </p>
                                    )}
                                    {best && suggestion.agency && (
                                        <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                            <span>
                                                Agent conseillé :{' '}
                                                <Link
                                                    href={agentShow({
                                                        agent: best.uuid,
                                                    })}
                                                    className="text-foreground font-medium underline-offset-4 hover:underline"
                                                >
                                                    {best.name}
                                                </Link>
                                                {best.position &&
                                                    ` · ${best.position}`}
                                                {best.relationship_quality_label &&
                                                    ` · relation ${best.relationship_quality_label.toLowerCase()}`}
                                            </span>
                                            {best.phone && (
                                                <a
                                                    href={`tel:${best.phone.replace(/\s+/g, '')}`}
                                                    className="hover:text-foreground inline-flex items-center gap-1"
                                                >
                                                    <Phone
                                                        className="size-3"
                                                        aria-hidden
                                                    />
                                                    <span className="tabular-nums">
                                                        {best.phone}
                                                    </span>
                                                </a>
                                            )}
                                            {best.email && (
                                                <a
                                                    href={`mailto:${best.email}`}
                                                    className="hover:text-foreground inline-flex items-center gap-1"
                                                >
                                                    <Mail
                                                        className="size-3"
                                                        aria-hidden
                                                    />
                                                    {best.email}
                                                </a>
                                            )}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() =>
                                                setSending(suggestion)
                                            }
                                        >
                                            <Send aria-hidden />
                                            Envoyer la recherche
                                        </Button>
                                        {best && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={
                                                    isCurrent ||
                                                    choosing === best.id
                                                }
                                                onClick={() => choose(best.id)}
                                            >
                                                {choosing === best.id ? (
                                                    <Spinner />
                                                ) : (
                                                    <UserCheck aria-hidden />
                                                )}
                                                {isCurrent
                                                    ? 'Agent du dossier'
                                                    : 'Choisir cet agent'}
                                            </Button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </DetailSection>
            {sending && (
                <SendHousingSearchDialog
                    open
                    onOpenChange={(open) => {
                        if (!open) {
                            setSending(null);
                        }
                    }}
                    clientUuid={clientUuid}
                    suggestion={sending}
                />
            )}
            <DiscoverAgenciesDialog
                open={discovering}
                onOpenChange={setDiscovering}
                clientUuid={clientUuid}
                districts={districts}
            />
        </>
    );
}
