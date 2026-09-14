import { router, usePage } from '@inertiajs/react';
import { Pencil, Sparkles, Target } from 'lucide-react';
import { useState } from 'react';
import { AiBadge } from '@/components/ai-badge';
import { AgencyProfileDialog } from '@/components/real-estate/agency-profile-dialog';
import {
    DetailSection,
    missingValue,
} from '@/components/real-estate/detail-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
    aiProfileLines,
    districtLabel,
    rentRange,
    yesNo,
} from '@/lib/agency-profile';
import type { AgencyDetail, Agent, ProfileOptions } from '@/types';

type AgencyProps = {
    scope: 'agency';
    agency: AgencyDetail;
    options: ProfileOptions;
    /** Routes : PATCH profil, POST lecture IA, POST appliquer, DELETE écarter. */
    urls: { profile: string; enrich: string; apply: string; dismiss: string };
};

type AgentProps = {
    scope: 'agent';
    agent: Agent;
    options: ProfileOptions;
    urls: { profile: string };
};

function Pills({ values }: { values: string[] }) {
    return values.length === 0 ? (
        <>{missingValue}</>
    ) : (
        <span className="flex flex-wrap gap-1">
            {values.map((value) => (
                <Badge key={value} variant="secondary" className="font-normal">
                    {value}
                </Badge>
            ))}
        </span>
    );
}

/**
 * Carte « Profil de matching » des fiches agence et agent : ce que le matching
 * sait de lui, modifiable à la main, et — pour une agence — la lecture de son
 * site par l'assistant, qui propose et ne décide jamais.
 */
export function AgencyProfileCard(props: AgencyProps | AgentProps) {
    const [editing, setEditing] = useState(false);
    const [reading, setReading] = useState(false);
    const assistant = usePage().props.features?.assistant ?? false;
    const profile = props.scope === 'agency' ? props.agency : props.agent;
    const name =
        props.scope === 'agency' ? props.agency.name : props.agent.name;
    const districts = (profile.districts ?? []).map(districtLabel);
    const proposal =
        props.scope === 'agency' ? (props.agency.ai_profile ?? null) : null;
    const hasProfile =
        props.scope === 'agency'
            ? (props.agency.has_profile ?? false)
            : [
                  props.agent.districts,
                  props.agent.specialties,
                  props.agent.languages,
              ].some((list) => (list ?? []).length > 0);

    const rows: { label: string; value: React.ReactNode }[] = [
        { label: 'Quartiers', value: <Pills values={districts} /> },
        {
            label: 'Spécialités',
            value: <Pills values={profile.specialty_labels ?? []} />,
        },
        {
            label: 'Langues',
            value: <Pills values={profile.language_labels ?? []} />,
        },
    ];
    if (props.scope === 'agency') {
        rows.push(
            {
                label: 'Mandats',
                value: <Pills values={props.agency.mandate_labels ?? []} />,
            },
            {
                label: 'Loyers',
                value:
                    rentRange(
                        props.agency.rent_min_cents,
                        props.agency.rent_max_cents,
                    ) ?? missingValue,
            },
            {
                label: 'Frais d’agence',
                value: props.agency.fee_note ?? missingValue,
            },
            {
                label: 'Garantme',
                value: yesNo(props.agency.accepts_garantme) ?? missingValue,
            },
            {
                label: 'Dossiers étrangers',
                value:
                    yesNo(props.agency.accepts_foreign_files) ?? missingValue,
            },
        );
    }

    const read = () => {
        if (props.scope !== 'agency') {
            return;
        }
        setReading(true);
        router.post(
            props.urls.enrich,
            {},
            { preserveScroll: true, onFinish: () => setReading(false) },
        );
    };

    return (
        <>
            <DetailSection
                title="Profil de matching"
                icon={Target}
                action={
                    <span className="flex gap-2">
                        {props.scope === 'agency' &&
                            assistant &&
                            props.agency.website && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={reading}
                                    onClick={read}
                                >
                                    {reading ? (
                                        <Spinner />
                                    ) : (
                                        <Sparkles aria-hidden />
                                    )}
                                    Lire le site avec l’IA
                                </Button>
                            )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditing(true)}
                        >
                            <Pencil aria-hidden />
                            Modifier le profil
                        </Button>
                    </span>
                }
            >
                {!hasProfile && !proposal && (
                    <p className="text-muted-foreground text-sm">
                        {props.scope === 'agency'
                            ? 'Rien de renseigné pour l’instant : le matching ne s’appuie que sur ses biens et ses visites. Complétez à la main, ou faites lire son site à l’assistant.'
                            : 'Rien de propre à cet agent : le profil de son agence sert au matching.'}
                    </p>
                )}
                {proposal && props.scope === 'agency' && (
                    <div
                        role="note"
                        className="grid gap-2 rounded-lg border border-violet-200 bg-violet-50/60 p-3 text-sm dark:border-violet-900 dark:bg-violet-950/30"
                    >
                        <div className="flex flex-wrap items-center gap-2">
                            <AiBadge label="Profil proposé" />
                            <span className="text-muted-foreground text-xs">
                                Lu sur le site de l’agence. Relisez, puis
                                appliquez : seuls les champs vides seront
                                remplis.
                            </span>
                        </div>
                        {proposal.summary && <p>{proposal.summary}</p>}
                        <dl className="grid gap-1 text-xs">
                            {aiProfileLines(proposal, props.options).map(
                                (line) => (
                                    <div
                                        key={line.label}
                                        className="grid grid-cols-[8rem_minmax(0,1fr)] gap-2"
                                    >
                                        <dt className="text-muted-foreground">
                                            {line.label}
                                        </dt>
                                        <dd>{line.value}</dd>
                                    </div>
                                ),
                            )}
                        </dl>
                        {proposal.notes && (
                            <p className="text-muted-foreground text-xs whitespace-pre-line">
                                {proposal.notes}
                            </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                            <Button
                                size="sm"
                                onClick={() =>
                                    router.post(
                                        props.urls.apply,
                                        {},
                                        { preserveScroll: true },
                                    )
                                }
                            >
                                Appliquer au profil
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                    router.delete(props.urls.dismiss, {
                                        preserveScroll: true,
                                    })
                                }
                            >
                                Ignorer
                            </Button>
                        </div>
                    </div>
                )}
                {hasProfile && (
                    <dl className="divide-border grid divide-y text-sm">
                        {rows.map((row) => (
                            <div
                                key={row.label}
                                className="grid gap-1 py-2 first:pt-0 last:pb-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4"
                            >
                                <dt className="text-muted-foreground">
                                    {row.label}
                                </dt>
                                <dd>{row.value}</dd>
                            </div>
                        ))}
                    </dl>
                )}
            </DetailSection>
            <AgencyProfileDialog
                open={editing}
                onOpenChange={setEditing}
                scope={props.scope}
                name={name}
                profile={profile}
                options={props.options}
                url={props.urls.profile}
            />
        </>
    );
}
