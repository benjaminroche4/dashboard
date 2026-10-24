import { Link, router } from '@inertiajs/react';
import { Plus, Unlink } from 'lucide-react';
import { useState } from 'react';
import { OfferBadge } from '@/components/clients/offer-badge';
import { DetailSection } from '@/components/real-estate/detail-header';
import { SearchSelect } from '@/components/search-select';
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
import { parisFormat } from '@/lib/datetime';
import { show as clientShow } from '@/routes/clients';
import {
    destroy as detachClient,
    store as attachClient,
} from '@/routes/companies/clients';
import type { CompanyClient, CompanyClientOption } from '@/types';

const arrivalDate = parisFormat({
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

/**
 * Dossiers clients rattachés à une entreprise : ses collaborateurs que
 * l'équipe reloge. « Rattacher un client » choisit parmi les dossiers encore
 * libres ; chaque ligne mène au dossier et peut être détachée.
 */
export function CompanyClients({
    companyUuid,
    clients,
    options,
    canEdit = true,
}: {
    companyUuid: string;
    clients: CompanyClient[];
    /** Dossiers clients sans entreprise, à proposer. */
    options: CompanyClientOption[];
    canEdit?: boolean;
}) {
    const [attaching, setAttaching] = useState(false);
    const [chosen, setChosen] = useState('');
    const [processing, setProcessing] = useState(false);

    const attach = () => {
        if (chosen === '') {
            return;
        }

        router.post(
            attachClient({ company: companyUuid }).url,
            { lead_id: Number(chosen) },
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    setAttaching(false);
                    setChosen('');
                },
            },
        );
    };

    const detach = (client: CompanyClient) => {
        router.delete(
            detachClient({ company: companyUuid, lead: client.uuid }).url,
            { preserveScroll: true },
        );
    };

    return (
        <DetailSection
            title="Dossiers clients"
            count={clients.length}
            action={
                canEdit && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAttaching(true)}
                    >
                        <Plus aria-hidden />
                        Rattacher un client
                    </Button>
                )
            }
        >
            {clients.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                    Aucun dossier client rattaché. Rattachez les collaborateurs
                    de l’entreprise que l’équipe reloge.
                </p>
            ) : (
                <ul role="list" className="divide-border grid divide-y">
                    {clients.map((client) => (
                        <li
                            key={client.id}
                            className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm first:pt-0 last:pb-0"
                        >
                            <span className="grid min-w-0 flex-1">
                                <span className="flex min-w-0 items-center gap-2">
                                    <Link
                                        href={clientShow({ lead: client.uuid })}
                                        className="truncate font-medium underline-offset-4 hover:underline"
                                    >
                                        {client.name}
                                    </Link>
                                    {client.offer_label && (
                                        <OfferBadge
                                            offer={client.offer}
                                            label={client.offer_label}
                                        />
                                    )}
                                    {client.is_closed && (
                                        <Badge variant="outline">Clôturé</Badge>
                                    )}
                                </span>
                                <span className="text-muted-foreground truncate text-xs tabular-nums">
                                    {[
                                        client.reference,
                                        client.arrival_at
                                            ? `Arrivée le ${arrivalDate.format(new Date(client.arrival_at))}`
                                            : null,
                                        client.assignee
                                            ? `Suivi par ${client.assignee}`
                                            : null,
                                    ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </span>
                            </span>
                            {canEdit && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="shrink-0"
                                    aria-label={`Détacher ${client.name}`}
                                    onClick={() => detach(client)}
                                >
                                    <Unlink aria-hidden />
                                    Détacher
                                </Button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            <Dialog open={attaching} onOpenChange={setAttaching}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Rattacher un client</DialogTitle>
                        <DialogDescription>
                            Un dossier client ne dépend que d’une entreprise :
                            seuls les dossiers encore libres sont proposés.
                        </DialogDescription>
                    </DialogHeader>
                    <SearchSelect
                        id="company-client"
                        value={chosen}
                        onChange={setChosen}
                        options={options.map((option) => ({
                            value: String(option.id),
                            label: option.name,
                            hint: [option.reference, option.company]
                                .filter(Boolean)
                                .join(' · '),
                            keywords: [
                                option.reference ?? '',
                                option.company ?? '',
                            ],
                        }))}
                        placeholder="Choisir un dossier client"
                        searchPlaceholder="Nom, référence ou société…"
                        noResults="Aucun dossier client libre."
                    />
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setAttaching(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="button"
                            onClick={attach}
                            disabled={chosen === '' || processing}
                        >
                            Rattacher
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DetailSection>
    );
}
