import { router } from '@inertiajs/react';
import { Sparkles, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { AiBadge } from '@/components/ai-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { parisFormat } from '@/lib/datetime';
import { brief as requestBrief } from '@/routes/tools/documents';
import type { DocumentRequestDetail } from '@/types';

/** Les trois cartes, dans l'ordre de la page de garde. */
const figureTitles = [
    ['salary', 'Salaires'],
    ['taxes', 'Imposition'],
    ['savings', 'Épargne'],
] as const;

const generatedAt = parisFormat({
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
});

/**
 * Le dossier préparé par l'assistant : une page de garde qui présente le
 * foyer et une fiche récapitulative devant chaque partie (identité, revenus,
 * impôts, épargne…), rédigées sur les pièces validées. La carte dit où on en
 * est (pas encore complet, à préparer, en cours, prêt, ou périmé parce que
 * les pièces ont changé) et c’est la fusion qui les insère dans le PDF.
 */
export function DossierBriefCard({
    request,
    canUpdate,
    assistant,
}: {
    request: DocumentRequestDetail;
    canUpdate: boolean;
    /** `features.assistant` : sans clé, la carte explique seulement. */
    assistant: boolean;
}) {
    const [sending, setSending] = useState(false);
    const brief = request.brief ?? null;
    const complete = request.is_complete === true;
    const missing = request.missing_count ?? 0;
    const pending = brief?.pending === true;
    const cover = brief?.cover ?? null;
    const ready = cover !== null;
    const stale = ready && brief?.fresh === false;

    const generate = () => {
        setSending(true);
        router.post(
            requestBrief({ documentRequest: request.uuid }).url,
            {},
            { preserveScroll: true, onFinish: () => setSending(false) },
        );
    };

    const action = canUpdate && assistant && complete && !pending && (
        <Button
            type="button"
            size="sm"
            variant={ready ? 'outline' : 'default'}
            disabled={sending}
            onClick={generate}
        >
            {sending ? <Spinner /> : <Sparkles aria-hidden />}
            {ready ? 'Préparer de nouveau' : 'Préparer le dossier avec l’IA'}
        </Button>
    );

    return (
        <div className="grid gap-3">
            <p className="text-muted-foreground text-sm">
                Une page de garde qui présente le foyer et une fiche
                récapitulative en tête de chaque partie (identité, situation
                professionnelle, revenus, impôts, épargne, garanties, logement),
                rédigées sur les pièces validées. Elles entrent dans le dossier
                fusionné.
            </p>

            {!complete && (
                <p className="text-sm" role="status">
                    Le dossier se prépare une fois{' '}
                    <strong>chaque pièce validée</strong>
                    {missing > 0 && (
                        <> : {missing} pièce(s) encore sans fichier validé</>
                    )}
                    .
                </p>
            )}

            {complete && !assistant && (
                <p className="text-muted-foreground text-sm" role="status">
                    Assistant IA non configuré (ANTHROPIC_API_KEY).
                </p>
            )}

            {pending && (
                <p
                    className="flex items-center gap-2 text-sm"
                    role="status"
                    aria-live="polite"
                >
                    <Spinner />
                    L’assistant lit les pièces et rédige les fiches : quelques
                    minutes.
                </p>
            )}

            {brief && cover && (
                <div className="grid gap-3 rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        <AiBadge label="Dossier préparé" />
                        {brief.generated_at && (
                            <span className="text-muted-foreground">
                                le{' '}
                                {generatedAt.format(
                                    new Date(brief.generated_at),
                                )}
                            </span>
                        )}
                        {stale && (
                            <Badge
                                variant="outline"
                                className="gap-1 border-amber-300 text-amber-700"
                            >
                                <TriangleAlert className="size-3" aria-hidden />
                                Pièces modifiées depuis
                            </Badge>
                        )}
                    </div>

                    {stale && (
                        <p className="text-sm text-amber-700" role="status">
                            Les pièces validées ont changé depuis cette synthèse
                            : le dossier fusionné part sans fiches tant qu’elle
                            n’est pas préparée de nouveau.
                        </p>
                    )}

                    {/* Trois cartes fixes : ce qu'un bailleur regarde d'abord.
                        Une pièce absente le dit, plutôt que de cacher la carte. */}
                    <dl
                        className="grid gap-2 sm:grid-cols-3"
                        aria-label="Chiffres du foyer"
                    >
                        {figureTitles.map(([key, title]) => {
                            const figure = cover.figures[key];

                            return (
                                <div
                                    key={key}
                                    className="bg-muted/40 grid content-start gap-1 rounded-lg border p-3"
                                >
                                    <dt className="text-muted-foreground text-xs">
                                        {title}
                                    </dt>
                                    <dd
                                        className={
                                            figure.value === null
                                                ? 'text-muted-foreground text-sm'
                                                : 'text-base font-semibold tabular-nums'
                                        }
                                    >
                                        {figure.value ?? 'Non renseigné'}
                                    </dd>
                                    {figure.detail && (
                                        <dd className="text-muted-foreground text-xs">
                                            {figure.detail}
                                        </dd>
                                    )}
                                    {figure.breakdown.length > 0 && (
                                        <dd className="mt-1 grid gap-0.5 border-t pt-1 text-xs">
                                            {figure.breakdown.map((line) => (
                                                <span
                                                    key={line.label}
                                                    className="flex justify-between gap-2"
                                                >
                                                    <span className="truncate">
                                                        {line.label}
                                                    </span>
                                                    <span className="font-medium tabular-nums">
                                                        {line.value}
                                                    </span>
                                                </span>
                                            ))}
                                        </dd>
                                    )}
                                </div>
                            );
                        })}
                    </dl>

                    <p className="line-clamp-4 text-sm whitespace-pre-line">
                        {cover.summary}
                    </p>

                    {cover.highlights.length > 0 && (
                        <ul
                            className="grid gap-1 text-sm"
                            aria-label="Points forts"
                        >
                            {cover.highlights.map((highlight) => (
                                <li
                                    key={highlight}
                                    className="flex gap-2 font-medium"
                                >
                                    <span aria-hidden className="text-primary">
                                        •
                                    </span>
                                    {highlight}
                                </li>
                            ))}
                        </ul>
                    )}

                    {cover.caveats.length > 0 && (
                        <ul className="grid gap-1 text-sm text-amber-700">
                            {cover.caveats.map((caveat) => (
                                <li key={caveat} className="flex gap-2">
                                    <TriangleAlert
                                        className="mt-0.5 size-3.5 shrink-0"
                                        aria-hidden
                                    />
                                    {caveat}
                                </li>
                            ))}
                        </ul>
                    )}

                    <ul
                        className="divide-y text-sm"
                        aria-label="Fiches récapitulatives"
                    >
                        {brief.sections.map((section) => (
                            <li
                                key={section.key}
                                className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
                            >
                                <div className="min-w-0">
                                    <div className="text-muted-foreground text-xs uppercase">
                                        {section.label} · {section.person}
                                    </div>
                                    <div className="truncate font-medium">
                                        {section.title}
                                    </div>
                                    {section.summary === null && (
                                        <div className="text-muted-foreground text-xs">
                                            Partie non lue : la fiche liste
                                            seulement les pièces.
                                        </div>
                                    )}
                                </div>
                                <Badge
                                    variant="secondary"
                                    className="shrink-0 tabular-nums"
                                >
                                    {section.documents.length} fichier(s)
                                </Badge>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {action && <div className="flex justify-end">{action}</div>}
        </div>
    );
}
