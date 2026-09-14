import { Link, router, usePage } from '@inertiajs/react';
import { MapPin, Plus, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { districtLabel } from '@/lib/agency-profile';
import { askAssistant } from '@/lib/assistant-request';
import { show as agencyShow } from '@/routes/agencies';
import { discover, fromPlace } from '@/routes/clients/agencies';
import type { DiscoveredAgency } from '@/types';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientUuid: string;
    districts: number[];
};

/**
 * « Trouver d'autres agences » : Google Places cherche des agences dans les
 * quartiers visés ; celles qui manquent à l'annuaire s'y ajoutent d'un clic,
 * celles déjà connues renvoient à leur fiche.
 */
export function DiscoverAgenciesDialog({
    open,
    onOpenChange,
    clientUuid,
    districts,
}: Props) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [agencies, setAgencies] = useState<DiscoveredAgency[] | null>(null);
    const [adding, setAdding] = useState<string | null>(null);
    // Le front masque, le serveur refuse : ajouter une agence demande « Modifier » sur les agents.
    const level = usePage().props.auth.access?.agents;
    const canAdd = level == null || level === 'write' || level === 'manage';

    useEffect(() => {
        if (!open || agencies !== null || loading) {
            return;
        }
        setLoading(true);
        setError(null);
        askAssistant<{ agencies: DiscoveredAgency[] }>(
            discover({ lead: clientUuid }).url,
        )
            .then((data) => setAgencies(data.agencies))
            .catch((caught: unknown) =>
                setError(
                    caught instanceof Error
                        ? caught.message
                        : 'La recherche n’a pas abouti.',
                ),
            )
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const add = (agency: DiscoveredAgency) => {
        setAdding(agency.id);
        router.post(
            fromPlace({ lead: clientUuid }).url,
            { place_id: agency.id },
            {
                preserveScroll: true,
                onSuccess: () =>
                    setAgencies((current) =>
                        (current ?? []).map((row) =>
                            row.id === agency.id
                                ? {
                                      ...row,
                                      known_uuid: row.known_uuid ?? 'added',
                                  }
                                : row,
                        ),
                    ),
                onFinish: () => setAdding(null),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Agences des quartiers visés</DialogTitle>
                    <DialogDescription>
                        Trouvées sur Google dans le{' '}
                        {districts.map(districtLabel).join(', ') || 'Paris'}.
                        Ajoutez celles qui manquent à l’annuaire : elles entrent
                        aussitôt dans le matching.
                    </DialogDescription>
                </DialogHeader>
                {loading && (
                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                        <Spinner /> Recherche en cours…
                    </p>
                )}
                {error && (
                    <p role="alert" className="text-destructive text-sm">
                        {error}
                    </p>
                )}
                {agencies !== null && agencies.length === 0 && (
                    <p className="text-muted-foreground text-sm">
                        Aucune agence trouvée dans ces quartiers.
                    </p>
                )}
                {agencies !== null && agencies.length > 0 && (
                    <ul role="list" className="divide-border grid divide-y">
                        {agencies.map((agency) => (
                            <li
                                key={agency.id}
                                className="flex items-start justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0"
                            >
                                <span className="grid min-w-0 gap-0.5">
                                    <span className="flex flex-wrap items-center gap-2">
                                        <span className="truncate font-medium">
                                            {agency.name}
                                        </span>
                                        {agency.rating !== null && (
                                            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs tabular-nums">
                                                <Star
                                                    className="size-3 fill-amber-400 text-amber-400"
                                                    aria-hidden
                                                />
                                                {agency.rating.toLocaleString(
                                                    'fr-FR',
                                                )}{' '}
                                                ({agency.ratings})
                                            </span>
                                        )}
                                    </span>
                                    <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                                        <MapPin
                                            className="size-3 shrink-0"
                                            aria-hidden
                                        />
                                        <span className="truncate">
                                            {agency.address}
                                        </span>
                                    </span>
                                </span>
                                {agency.known_uuid ? (
                                    agency.known_uuid === 'added' ? (
                                        <span className="text-muted-foreground shrink-0 text-xs">
                                            Ajoutée
                                        </span>
                                    ) : (
                                        <Link
                                            href={agencyShow({
                                                agency: agency.known_uuid,
                                            })}
                                            className="shrink-0 text-xs underline-offset-4 hover:underline"
                                        >
                                            Déjà dans l’annuaire
                                        </Link>
                                    )
                                ) : (
                                    canAdd && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={adding === agency.id}
                                            onClick={() => add(agency)}
                                        >
                                            {adding === agency.id ? (
                                                <Spinner />
                                            ) : (
                                                <Plus aria-hidden />
                                            )}
                                            Ajouter
                                        </Button>
                                    )
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </DialogContent>
        </Dialog>
    );
}
