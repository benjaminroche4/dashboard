import { Link, router, useForm, usePage } from '@inertiajs/react';
import { CalendarPlus, ExternalLink, Link2, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AiBadge } from '@/components/ai-badge';
import InputError from '@/components/input-error';
import { formatAddress } from '@/components/real-estate/columns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { formatMoney } from '@/lib/format';
import { destroy, explain, store } from '@/routes/clients/properties';
import { create as visitCreate } from '@/routes/clients/visits';
import type {
    ClientProperty,
    ClientPropertyExplanation,
    ClientPropertyOption,
    ClientPropertySuggestion,
} from '@/types';

const fitLabels: Record<ClientPropertyExplanation['fit'], string> = {
    strong: 'À proposer en priorité',
    good: 'À proposer',
    weak: 'En réserve',
};

const fitTones: Record<ClientPropertyExplanation['fit'], string> = {
    strong: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
    good: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    weak: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400',
};

const dateTime = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
});

/**
 * Biens rattachés à un dossier client : liste avec les visites du client,
 * « Planifier une visite » prérempli, retrait, et « Lier un bien » de l'annuaire.
 */
export function ClientProperties({
    clientUuid,
    properties,
    options,
    suggestions = [],
}: {
    clientUuid: string;
    properties: ClientProperty[];
    options: ClientPropertyOption[];
    /** Biens de l'annuaire qui correspondent au projet du client. */
    suggestions?: ClientPropertySuggestion[];
}) {
    const [linking, setLinking] = useState(false);
    const [removing, setRemoving] = useState<number | null>(null);
    const [attaching, setAttaching] = useState<number | null>(null);
    // Avis de l'assistant IA sur les suggestions (à la demande), et classement affiné.
    const assistantEnabled = usePage().props.features?.assistant ?? false;
    const [explaining, setExplaining] = useState(false);
    const [explainError, setExplainError] = useState<string | null>(null);
    const [explanations, setExplanations] = useState<
        Record<number, ClientPropertyExplanation>
    >({});
    const [ranking, setRanking] = useState<number[]>([]);
    const rank = (id: number) =>
        ranking.includes(id) ? ranking.indexOf(id) : 99;
    const orderedSuggestions =
        ranking.length > 0
            ? [...suggestions].sort((a, b) => rank(a.id) - rank(b.id))
            : suggestions;

    const refine = async () => {
        setExplaining(true);
        setExplainError(null);

        try {
            const response = await fetch(explain({ lead: clientUuid }).url, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': decodeURIComponent(
                        document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '',
                    ),
                },
            });
            const data = (await response.json()) as {
                ranking?: number[];
                explanations?: ClientPropertyExplanation[];
                message?: string;
            };

            if (!response.ok) {
                setExplainError(
                    data.message ??
                        'L’assistant n’a pas pu affiner les suggestions.',
                );

                return;
            }

            setRanking(data.ranking ?? []);
            setExplanations(
                Object.fromEntries(
                    (data.explanations ?? []).map((item) => [item.id, item]),
                ),
            );
        } catch {
            setExplainError('L’assistant n’a pas pu affiner les suggestions.');
        } finally {
            setExplaining(false);
        }
    };
    const form = useForm<{ property_id: string }>({ property_id: '' });

    useEffect(() => {
        if (linking) {
            form.setData('property_id', '');
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [linking]);

    const link = () =>
        form.post(store({ lead: clientUuid }).url, {
            preserveScroll: true,
            onSuccess: () => setLinking(false),
        });

    const attach = (suggestion: ClientPropertySuggestion) => {
        setAttaching(suggestion.id);
        router.post(
            store({ lead: clientUuid }).url,
            { property_id: suggestion.id },
            { preserveScroll: true, onFinish: () => setAttaching(null) },
        );
    };

    const remove = (property: ClientProperty) => {
        setRemoving(property.id);
        router.delete(
            destroy({ lead: clientUuid, property: property.uuid }).url,
            { preserveScroll: true, onFinish: () => setRemoving(null) },
        );
    };

    return (
        <div className="grid gap-4">
            {properties.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                    Aucun bien rattaché à ce dossier.
                </p>
            ) : (
                <ul role="list" className="grid gap-3">
                    {properties.map((property) => (
                        <li
                            key={property.id}
                            className="bg-sidebar flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3 text-sm"
                        >
                            <div className="grid min-w-0 gap-0.5">
                                <span className="flex flex-wrap items-center gap-2 font-medium">
                                    {property.label}
                                    {property.listing_url && (
                                        <a
                                            href={property.listing_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            aria-label={`Annonce de ${property.label}`}
                                            className="text-muted-foreground hover:text-foreground"
                                        >
                                            <ExternalLink
                                                className="size-3.5"
                                                aria-hidden
                                            />
                                        </a>
                                    )}
                                </span>
                                <span className="text-muted-foreground truncate text-xs">
                                    {[
                                        formatAddress(property),
                                        property.property_type_label,
                                        property.surface_m2
                                            ? `${property.surface_m2} m²`
                                            : null,
                                        property.rent_cents !== null
                                            ? `${formatMoney(property.rent_cents, property.currency)} / mois`
                                            : null,
                                        property.agent
                                            ? `Agent : ${property.agent}`
                                            : null,
                                    ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                    {property.visits_count === 0
                                        ? 'Aucune visite'
                                        : `${property.visits_count} visite(s)`}
                                    {property.next_visit_at &&
                                        ` · prochaine ${dateTime.format(new Date(property.next_visit_at))}`}
                                </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                                <Button variant="outline" size="sm" asChild>
                                    <Link
                                        href={visitCreate({
                                            query: {
                                                client: clientUuid,
                                                property: property.uuid,
                                            },
                                        })}
                                    >
                                        <CalendarPlus aria-hidden />
                                        Planifier une visite
                                    </Link>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Retirer ${property.label} du dossier`}
                                    disabled={removing === property.id}
                                    onClick={() => remove(property)}
                                >
                                    {removing === property.id ? (
                                        <Spinner />
                                    ) : (
                                        <X aria-hidden />
                                    )}
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            <div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLinking(true)}
                    disabled={options.length === 0}
                >
                    <Link2 aria-hidden />
                    Lier un bien
                </Button>
                {options.length === 0 && (
                    <p className="text-muted-foreground mt-2 text-xs">
                        Tous les biens de l’annuaire sont déjà rattachés, ou
                        l’annuaire est vide.
                    </p>
                )}
            </div>

            {suggestions.length > 0 && (
                <section
                    aria-label="Biens suggérés"
                    className="grid gap-3 border-t pt-4"
                >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="grid gap-0.5">
                            <h3 className="flex items-center gap-2 text-sm font-medium">
                                <Sparkles
                                    className="text-primary size-4"
                                    aria-hidden
                                />
                                Biens qui correspondent au projet
                            </h3>
                            <p className="text-muted-foreground text-xs">
                                D’après le budget, les arrondissements, le type
                                de bien et le meublé demandés. Les biens déjà
                                rattachés ou visités ne sont pas proposés.
                            </p>
                        </div>
                        {assistantEnabled && (
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
                    </div>
                    {explainError && (
                        <p role="alert" className="text-destructive text-sm">
                            {explainError}
                        </p>
                    )}
                    <ul role="list" className="grid gap-3">
                        {orderedSuggestions.map((suggestion) => (
                            <li
                                key={suggestion.id}
                                className="bg-background flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3 text-sm"
                            >
                                <div className="grid min-w-0 gap-1">
                                    <span className="flex flex-wrap items-center gap-2 font-medium">
                                        {suggestion.label}
                                        {suggestion.listing_url && (
                                            <a
                                                href={suggestion.listing_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                aria-label={`Annonce de ${suggestion.label}`}
                                                className="text-muted-foreground hover:text-foreground"
                                            >
                                                <ExternalLink
                                                    className="size-3.5"
                                                    aria-hidden
                                                />
                                            </a>
                                        )}
                                    </span>
                                    <span className="text-muted-foreground truncate text-xs">
                                        {[
                                            formatAddress(suggestion),
                                            suggestion.property_type_label,
                                            suggestion.furnished_label,
                                            suggestion.surface_m2
                                                ? `${suggestion.surface_m2} m²`
                                                : null,
                                            suggestion.rent_cents !== null
                                                ? `${formatMoney(suggestion.rent_cents, suggestion.currency)} / mois`
                                                : null,
                                            suggestion.agent
                                                ? `Agent : ${suggestion.agent}`
                                                : null,
                                        ]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </span>
                                    {explanations[suggestion.id] && (
                                        <span
                                            data-testid="suggestion-explanation"
                                            className="flex flex-wrap items-center gap-2 pt-1 text-sm"
                                        >
                                            <AiBadge />
                                            <Badge
                                                variant="secondary"
                                                className={`font-medium ${fitTones[explanations[suggestion.id]!.fit]}`}
                                            >
                                                {
                                                    fitLabels[
                                                        explanations[
                                                            suggestion.id
                                                        ]!.fit
                                                    ]
                                                }
                                            </Badge>
                                            <span>
                                                {
                                                    explanations[suggestion.id]!
                                                        .reason
                                                }
                                            </span>
                                        </span>
                                    )}
                                    <span className="flex flex-wrap gap-1 pt-0.5">
                                        {suggestion.reasons.map((reason) => (
                                            <Badge
                                                key={reason}
                                                variant="secondary"
                                                className="bg-green-50 font-medium text-green-700 dark:bg-green-950 dark:text-green-300"
                                            >
                                                {reason}
                                            </Badge>
                                        ))}
                                    </span>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={attaching === suggestion.id}
                                        onClick={() => attach(suggestion)}
                                    >
                                        {attaching === suggestion.id ? (
                                            <Spinner />
                                        ) : (
                                            <Link2 aria-hidden />
                                        )}
                                        Lier au dossier
                                    </Button>
                                    <Button variant="outline" size="sm" asChild>
                                        <Link
                                            href={visitCreate({
                                                query: {
                                                    client: clientUuid,
                                                    property: suggestion.uuid,
                                                },
                                            })}
                                        >
                                            <CalendarPlus aria-hidden />
                                            Planifier une visite
                                        </Link>
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <Dialog open={linking} onOpenChange={setLinking}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Lier un bien au dossier</DialogTitle>
                        <DialogDescription>
                            Choisissez un bien de l’annuaire. Vous pourrez
                            ensuite planifier une visite dessus.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        className="grid gap-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            link();
                        }}
                    >
                        <div className="grid gap-2">
                            <Label htmlFor="client-property">Bien</Label>
                            <Select
                                value={form.data.property_id}
                                onValueChange={(value) =>
                                    form.setData('property_id', value)
                                }
                            >
                                <SelectTrigger
                                    id="client-property"
                                    className="w-full"
                                >
                                    <SelectValue placeholder="Choisir un bien" />
                                </SelectTrigger>
                                <SelectContent>
                                    {options.map((option) => (
                                        <SelectItem
                                            key={option.id}
                                            value={String(option.id)}
                                        >
                                            {option.label}
                                            {option.label !== option.street && (
                                                <span className="text-muted-foreground">
                                                    {' '}
                                                    · {option.street}
                                                </span>
                                            )}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={form.errors.property_id} />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setLinking(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    form.processing ||
                                    form.data.property_id === ''
                                }
                            >
                                {form.processing && <Spinner />}
                                Lier le bien
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
